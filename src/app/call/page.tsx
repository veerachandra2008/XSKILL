'use client';

import type {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock3, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim() || '';

type CallPhase = 'connecting' | 'connected' | 'ended' | 'failed';

const clearContainer = (containerId: string) => {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function CallPage() {
  const searchParams = useSearchParams();
  const channel = searchParams.get('channel');
  const contactName = searchParams.get('name') || 'Contact';
  const callRole = searchParams.get('role') || 'outgoing';

  const cleanupRef = useRef<(() => Promise<void>) | null>(null);
  const cleanedUpRef = useRef(false);
  const callStartedAtRef = useRef<number | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);

  const [callPhase, setCallPhase] = useState<CallPhase>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (callPhase !== 'connected' || !callStartedAtRef.current) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - callStartedAtRef.current!) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [callPhase]);

  useEffect(() => {
    if (!APP_ID) {
      setCallPhase('failed');
      setErrorMessage('Agora App ID is missing. Set NEXT_PUBLIC_AGORA_APP_ID.');
      return;
    }

    if (!channel) {
      setCallPhase('failed');
      setErrorMessage('Call channel is missing.');
      return;
    }

    let mounted = true;
    cleanupRef.current = null;
    cleanedUpRef.current = false;
    callStartedAtRef.current = null;
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    setElapsedSeconds(0);
    setHasLocalVideo(false);
    setHasRemoteVideo(false);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setErrorMessage('');
    setCallPhase('connecting');

    const start = async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        const uid = Math.floor(Math.random() * 10000);

        const markConnected = () => {
          if (!callStartedAtRef.current) {
            callStartedAtRef.current = Date.now();
            setElapsedSeconds(0);
          }

          setCallPhase('connected');
        };

        const handleUserPublished = async (
          user: IAgoraRTCRemoteUser,
          mediaType: 'audio' | 'video'
        ) => {
          console.log('Remote event:', mediaType, 'user:', user.uid);
          await client.subscribe(user, mediaType);

          if (mediaType === 'video' && user.videoTrack) {
            clearContainer('remote-container');
            user.videoTrack.play('remote-container');
            setHasRemoteVideo(true);
            markConnected();
          }

          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
            markConnected();
          }
        };

        const handleUserUnpublished = (
          user: IAgoraRTCRemoteUser,
          mediaType: 'audio' | 'video'
        ) => {
          if (mediaType === 'video') {
            user.videoTrack?.stop();
            clearContainer('remote-container');
            setHasRemoteVideo(false);
          }

          if (mediaType === 'audio') {
            user.audioTrack?.stop();
          }
        };

        const handleUserLeft = async (user: IAgoraRTCRemoteUser) => {
          console.log('User left:', user.uid);
          clearContainer('remote-container');
          setHasRemoteVideo(false);
          setCallPhase('ended');
          await cleanupRef.current?.();
        };

        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);
        client.on('user-left', handleUserLeft);

        console.log('Joining channel:', channel);
        await client.join(APP_ID, channel, null, uid);
        console.log('Joined with UID:', uid);

        let localTracks:
          | Awaited<ReturnType<typeof AgoraRTC.createMicrophoneAndCameraTracks>>
          | [Awaited<ReturnType<typeof AgoraRTC.createMicrophoneAudioTrack>>];

        try {
          localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        } catch (error) {
          console.warn('Camera failed, switching to audio only', error);
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          localTracks = [audioTrack];
        }

        const runCleanup = async () => {
          if (cleanedUpRef.current) {
            return;
          }

          cleanedUpRef.current = true;
          client.off('user-published', handleUserPublished);
          client.off('user-unpublished', handleUserUnpublished);
          client.off('user-left', handleUserLeft);
          localTracks.forEach((track) => {
            track.stop();
            track.close();
          });
          localAudioTrackRef.current = null;
          localVideoTrackRef.current = null;
          clearContainer('local-container');
          clearContainer('remote-container');
          await client.leave();
        };

        cleanupRef.current = runCleanup;

        if (!mounted) {
          await runCleanup();
          return;
        }

        console.log('Tracks:', localTracks);
        const [audioTrack, videoTrack] = localTracks;
        localAudioTrackRef.current = audioTrack ?? null;
        setIsAudioEnabled(Boolean(audioTrack));
        localVideoTrackRef.current = videoTrack ?? null;
        setIsVideoEnabled(Boolean(videoTrack));

        if (videoTrack) {
          clearContainer('local-container');
          videoTrack.play('local-container');
          setHasLocalVideo(true);
        }

        await client.publish(localTracks);
        console.log('Published local tracks:', localTracks.length);

        await Promise.all(
          client.remoteUsers.flatMap((user) => {
            const pendingSubscriptions: Promise<void>[] = [];

            if (user.hasVideo) {
              pendingSubscriptions.push(handleUserPublished(user, 'video'));
            }

            if (user.hasAudio) {
              pendingSubscriptions.push(handleUserPublished(user, 'audio'));
            }

            return pendingSubscriptions;
          })
        );
      } catch (error) {
        console.error('Agora call failed', error);
        setCallPhase('failed');
        setErrorMessage('Failed to start the call.');
      }
    };

    void start();

    return () => {
      mounted = false;
      void cleanupRef.current?.().catch((error) => {
        console.error('Failed to clean up Agora call', error);
      });
    };
  }, [channel]);

  const endCall = async () => {
    setCallPhase('ended');
    await cleanupRef.current?.();
  };

  const toggleAudio = async () => {
    const audioTrack = localAudioTrackRef.current;
    if (!audioTrack) {
      return;
    }

    const nextEnabled = !isAudioEnabled;
    try {
      await audioTrack.setEnabled(nextEnabled);
      setIsAudioEnabled(nextEnabled);
    } catch (error) {
      console.error('Failed to toggle microphone', error);
    }
  };

  const toggleVideo = async () => {
    const videoTrack = localVideoTrackRef.current;
    if (!videoTrack) {
      return;
    }

    const nextEnabled = !isVideoEnabled;
    try {
      await videoTrack.setEnabled(nextEnabled);
      setIsVideoEnabled(nextEnabled);

      if (nextEnabled) {
        clearContainer('local-container');
        videoTrack.play('local-container');
        setHasLocalVideo(true);
        return;
      }

      videoTrack.stop();
      clearContainer('local-container');
      setHasLocalVideo(false);
    } catch (error) {
      console.error('Failed to toggle camera', error);
    }
  };

  const statusLabel =
    callPhase === 'connected'
      ? formatDuration(elapsedSeconds)
      : callPhase === 'ended'
        ? 'Call ended'
        : callPhase === 'failed'
          ? 'Call failed'
          : callRole === 'incoming'
            ? 'Connecting to call...'
            : 'Calling...';

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b141a] text-white">
      <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_32%),linear-gradient(180deg,#0f1f1c_0%,#0b141a_42%,#081015_100%)] px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/70">xSkill live session</p>
            <h1 className="mt-2 truncate text-2xl font-semibold">{contactName}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {statusLabel}
              {callPhase === 'connected' && (
                <span className="ml-3 inline-flex items-center gap-1 text-emerald-300">
                  <Clock3 className="h-4 w-4" />
                  Live
                </span>
              )}
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200 sm:flex">
            <Video className="h-4 w-4 text-emerald-300" />
            Channel: {channel || 'Unknown'}
          </div>
        </div>

        <div className="relative mx-auto mt-5 flex w-full max-w-6xl flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-black/25 shadow-2xl shadow-black/40">
          <div className="absolute inset-0" id="remote-container" />

          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_transparent_30%),linear-gradient(180deg,rgba(5,11,14,0.3),rgba(5,11,14,0.82))] text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/20 text-4xl font-semibold text-emerald-100">
                {contactName.slice(0, 1).toUpperCase()}
              </div>
              <p className="mt-6 text-3xl font-semibold">{contactName}</p>
              <p className="mt-2 text-sm text-slate-300">
                {callPhase === 'connected' ? 'Audio connected. Waiting for video.' : statusLabel}
              </p>
            </div>
          )}

          <div className="absolute right-4 top-4 z-10 w-28 overflow-hidden rounded-[24px] border border-white/10 bg-black/50 shadow-xl backdrop-blur-sm sm:w-40">
            <div id="local-container" className="aspect-[3/4] bg-slate-900" />
            {!hasLocalVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-xs text-slate-300">
                Camera off
              </div>
            )}
            <div className="border-t border-white/10 px-3 py-2 text-center text-xs text-slate-300">You</div>
          </div>
        </div>

        <div className="mx-auto mt-5 flex w-full max-w-md items-center justify-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
          <div className="rounded-full bg-white/8 px-4 py-2 text-sm text-slate-300">
            {callPhase === 'connected' ? formatDuration(elapsedSeconds) : statusLabel}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={toggleAudio}
            disabled={!localAudioTrackRef.current || callPhase === 'ended' || callPhase === 'failed'}
            className={`h-14 w-14 rounded-full border p-0 text-white ${
              isAudioEnabled
                ? 'border-white/15 bg-white/10 hover:bg-white/15'
                : 'border-amber-400/30 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
            } disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500`}
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={toggleVideo}
            disabled={!localVideoTrackRef.current || callPhase === 'ended' || callPhase === 'failed'}
            className={`h-14 w-14 rounded-full border p-0 text-white ${
              isVideoEnabled
                ? 'border-white/15 bg-white/10 hover:bg-white/15'
                : 'border-amber-400/30 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
            } disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500`}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          <Button
            type="button"
            onClick={endCall}
            disabled={callPhase === 'ended'}
            className="h-14 w-14 rounded-full bg-rose-500 p-0 text-white hover:bg-rose-600 disabled:bg-rose-900"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {errorMessage && (
          <div className="mx-auto mt-4 w-full max-w-xl rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-100">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
