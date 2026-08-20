"use client";

import { useEffect, useState } from "react";
import {
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { RoomHeader } from "@/components/meeting/room-header";
import { VideoGrid } from "@/components/meeting/video-grid";
import { ScreenShareLayout } from "@/components/meeting/screen-share-layout";
import { MeetingControls } from "@/components/meeting/room-controls";
import { ChatPanel } from "@/components/meeting/chat-panel";
import { CollaborationPanel } from "@/components/meeting/collaboration-panel";
import { ParticipantsPanel } from "@/components/meeting/participants-panel";
import { EndMeetingDialog } from "@/components/meeting/end-meeting-dialog";
import { TranscriptPanel } from "@/components/transcription/transcript-panel";
import { useTranscriptionPresence } from "@/hooks/use-transcription-presence";

interface MeetingRoomProps {
  meeting: { id: string; slug: string; title: string; host_id: string };
  displayName: string;
  isHost: boolean;
  localIdentity: string;
  onLeave: () => void;
  onEndConfirm: () => Promise<void>;
}

export function MeetingRoom({
  meeting,
  displayName,
  isHost,
  localIdentity,
  onLeave,
  onEndConfirm,
}: MeetingRoomProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const panelOpen = chatOpen || participantsOpen || notesOpen || transcriptOpen;

  const participants = useParticipants();
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const transcriptionPresence = useTranscriptionPresence({
    room,
    identity: localIdentity,
    displayName,
  });
  const sharing = screenTracks.length > 0;
  const localSharing = screenTracks.some(
    (t) => t.participant.identity === localIdentity,
  );

  const stopSharing = () => {
    void localParticipant.setScreenShareEnabled(false);
  };

  const toggleChat = () => {
    setParticipantsOpen(false);
    setNotesOpen(false);
    setTranscriptOpen(false);
    setChatOpen((v) => !v);
  };

  const toggleParticipants = () => {
    setChatOpen(false);
    setNotesOpen(false);
    setTranscriptOpen(false);
    setParticipantsOpen((v) => !v);
  };

  const toggleNotes = () => {
    setChatOpen(false);
    setParticipantsOpen(false);
    setTranscriptOpen(false);
    setNotesOpen((v) => !v);
  };

  const toggleTranscript = () => {
    setChatOpen(false);
    setParticipantsOpen(false);
    setNotesOpen(false);
    setTranscriptOpen((value) => !value);
  };

  useEffect(() => {
    if (!panelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setChatOpen(false);
      setParticipantsOpen(false);
      setNotesOpen(false);
      setTranscriptOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [panelOpen]);

  return (
    <div className="relative flex h-dvh w-full flex-col bg-room text-room-fg">
      <RoomHeader
        meetingSlug={meeting.slug}
        title={meeting.title}
        participantCount={participants.length}
        transcriptionActive={transcriptionPresence.active}
      />

      <main
        className={
          "relative flex min-h-0 flex-1 flex-col" +
          (sharing ? " sm:p-3" : "")
        }
      >
        {sharing ? (
          <ScreenShareLayout
            localIdentity={localIdentity}
            onStopSharing={
              localSharing
                ? stopSharing
                : undefined
            }
            transcriptionActive={transcriptionPresence.active}
          />
        ) : (
          <VideoGrid
            localIdentity={localIdentity}
            transcriptionActive={transcriptionPresence.active}
          />
        )}

        <RoomAudioRenderer />

        <ChatPanel
          open={chatOpen}
          meetingId={meeting.id}
          displayName={displayName}
          onClose={() => setChatOpen(false)}
          onNewMessage={setChatUnread}
        />

        <CollaborationPanel
          open={notesOpen}
          meetingId={meeting.id}
          displayName={displayName}
          onClose={() => setNotesOpen(false)}
        />

        <ParticipantsPanel
          open={participantsOpen}
          onClose={() => setParticipantsOpen(false)}
          localIdentity={localIdentity}
        />

        <TranscriptPanel
          open={transcriptOpen}
          meetingId={meeting.id}
          livekitIdentity={localIdentity}
          localParticipant={localParticipant}
          onClose={() => setTranscriptOpen(false)}
          onActiveChange={transcriptionPresence.setLocalActive}
        />

        <MeetingControls
          onToggleChat={toggleChat}
          onToggleParticipants={toggleParticipants}
          onToggleNotes={toggleNotes}
          onToggleTranscript={toggleTranscript}
          onLeave={onLeave}
          onEnd={() => setEndDialogOpen(true)}
          isHost={isHost}
          sharing={localSharing}
          chatUnread={chatUnread}
          chatOpen={chatOpen}
          participantsOpen={participantsOpen}
          notesOpen={notesOpen}
          transcriptOpen={transcriptOpen}
        />
      </main>

      <EndMeetingDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        onConfirm={onEndConfirm}
      />
    </div>
  );
}
