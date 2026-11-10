import { useEffect, useMemo, useState } from "react";
import { listJobChat, openJobRoomSocket, type ChatMessageSnapshot } from "../services/bidding";
import { getChatReadAt, hydrateChatRead, subscribeChatRead } from "../services/chatUnread";

/**
 * How many chat messages from the other party this user hasn't opened yet.
 *
 * Reads the thread once on mount (so the badge survives an app restart) and
 * then rides the job room's live chat pushes. The room socket is multiplexed
 * per topic, so this shares the connection the tracking screen already holds.
 */
export function useUnreadChat(
  jobId: string | undefined,
  actorId: string | undefined,
  actorRole: "customer" | "worker",
): number {
  const [messages, setMessages] = useState<ChatMessageSnapshot[]>([]);
  const [readAt, setReadAt] = useState(() => (jobId ? getChatReadAt(jobId) : 0));

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const sync = () => {
      if (active) setReadAt(getChatReadAt(jobId));
    };
    void hydrateChatRead.then(sync);
    sync();
    const unsubscribe = subscribeChatRead(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !actorId) {
      setMessages([]);
      return;
    }
    let active = true;
    listJobChat(jobId, actorId)
      .then(next => {
        if (active) setMessages(next);
      })
      .catch(() => undefined);

    const socket = openJobRoomSocket(jobId, actorRole, actorId, {
      onChat: next => {
        if (active) setMessages(next);
      },
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [jobId, actorId, actorRole]);

  return useMemo(
    () => messages.filter(m => m.senderRole !== actorRole && m.createdAt > readAt).length,
    [messages, readAt, actorRole],
  );
}
