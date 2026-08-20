"use client";

import { useEffect, useState } from "react";
import {
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
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
  const [chatUnread, setChatUnread] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const panelOpen = chatOpen || participantsOpen || notesOpen;

  const participants = useParticipants();
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const { localParticipant } = useLocalParticipant();
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
    setChatOpen((v) => !v);
  };

  const toggleParticipants = () => {
    setChatOpen(false);
    setNotesOpen(false);
    setParticipantsOpen((v) => !v);
  };

  const toggleNotes = () => {
    setChatOpen(false);
    setParticipantsOpen(false);
    setNotesOpen((v) => !v);
  };

  useEffect(() => {
    if (!panelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setChatOpen(false);
      setParticipantsOpen(false);
      setNotesOpen(false);
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
          />
        ) : (
          <VideoGrid localIdentity={localIdentity} />
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

        <MeetingControls
          onToggleChat={toggleChat}
          onToggleParticipants={toggleParticipants}
          onToggleNotes={toggleNotes}
          onLeave={onLeave}
          onEnd={() => setEndDialogOpen(true)}
          isHost={isHost}
          sharing={localSharing}
          chatUnread={chatUnread}
          chatOpen={chatOpen}
          participantsOpen={participantsOpen}
          notesOpen={notesOpen}
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
