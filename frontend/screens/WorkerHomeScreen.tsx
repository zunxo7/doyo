import React, { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Platform, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Briefcase, GearSix, Headset, UserCircle, Wallet } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import WorkerBottomNav, { type TabDef, type WorkerTab } from "../components/worker/WorkerBottomNav";
import JobsTab from "../components/worker/JobsTab";
import EarningsTab from "../components/worker/EarningsTab";
import AccountTab from "../components/worker/AccountTab";
import WorkerSettingsTab from "../components/worker/WorkerSettingsTab";
import ActiveJobView from "../components/worker/ActiveJobView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeWorkerStyles } from "../styles/WorkerHomeScreen.styles";
import { clearUser, getStoredUser, saveUser, setActiveMode } from "../services/auth";
import { findAccountByAuth } from "../services/onboarding";
import { avatarOwnerKeyFor, getAvatar, restoreAvatarFromRemote } from "../services/avatar";
import { DECLINE_SNOOZE_MS, EMPTY_WORKER_EARNINGS, type MarketPresence, type WorkerEarnings, cancelWorkerOffer, dismissJobForWorker, fetchWorkerActiveJob, fetchWorkerEarnings, fetchWorkerStats, getCurrentUserId, markWorkerOffline, markWorkerOnline, openJobRoomSocket, openMarketSocket, submitWorkerOffer, uploadWorkerPhoto, workerPhotoUrl } from "../services/bidding";
import type { LiveSocket } from "../services/liveSocket";
import { getCurrentPosition, getFreshCurrentPosition, watchPosition } from "../services/location";
import { WORKER_STATS, type WorkerJob } from "../services/workerJobs";
import { syncPushNotifications } from "../services/notifications";
import {
  getPendingOffline,
  getWorkerOnline,
  hydrateWorkerPresence,
  isWorkerPresenceReady,
  saveWorkerPresenceProfile,
  setPendingOffline,
  setWorkerOnline,
} from "../services/workerPresence";
import {
  hasBackgroundLocationPermission,
  openBackgroundLocationSettings,
  startWorkerLocationUpdates,
  stopWorkerLocationUpdates,
  watchAppStateForLocation,
} from "../services/backgroundLocation";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";
import { getCachedAppConfig } from "../services/appConfig";
import { WORKER_COMMISSION_LIMIT } from "../services/workerJobs";

// Every worker sees every service; the server filters jobs on this list, so a
// service missing here never reaches any worker.
const WORKER_SERVICES: NonNullable<MarketPresence["services"]> = ["home", "vehicle", "furniture"];

// What each OS calls background location in its own permission screens.
const ALWAYS_LOCATION_OPTION = Platform.OS === "ios" ? "Always" : "Allow all the time";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "WorkerHome">;
  route: RouteProp<RootStackParamList, "WorkerHome">;
};

const TAB_TITLES: Record<WorkerTab, string> = {
  jobs: "Jobs",
  earnings: "Earnings",
  account: "Account",
  settings: "Settings",
};

export default function WorkerHomeScreen({ navigation, route }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);

  const [tab, setTab] = useState<WorkerTab>("jobs");
  const [name] = useState(route.params?.name ?? "Worker");
  // Restored from storage, not defaulted to false — see services/workerPresence.
  const [online, setOnline] = useState(getWorkerOnline);
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [activeJob, setActiveJob] = useState<WorkerJob | null>(null);
  // Mirrors activeJob for callbacks that must not capture a stale value.
  // Declared here, beside the state, because the go-offline effect above the
  // old declaration site now reads it to decide whether to keep publishing
  // location.
  const activeJobRef = useRef<WorkerJob | null>(null);
  activeJobRef.current = activeJob;
  const [alert, setAlert] = useState<{
    title: string;
    message?: string;
    buttons?: React.ComponentProps<typeof CustomAlert>["buttons"];
  } | null>(null);
  const [workerId, setWorkerId] = useState("worker-local");
  // Lifetime completed-job count, read from the on-device earnings ledger and
  // sent with every online ping / offer so customers see a real number.
  // The whole summary, not just the count: this fetch already runs on entering
  // worker mode, and the earnings tab used to throw it away and refetch.
  const [earnings, setEarnings] = useState<WorkerEarnings>(EMPTY_WORKER_EARNINGS);
  const jobsCompleted = earnings.jobsCompleted;
  // Running rating average from real customer feedback (5.0 until first rated).
  const [workerRating, setWorkerRating] = useState(WORKER_STATS.rating);
  // Single source of truth for "I have a live offer on this job". JobsTab used
  // to keep its own copy, which drifted: the server could kill an offer and the
  // card would still say "Waiting for … to respond" forever.
  const [pendingOffers, setPendingOffers] = useState<Record<string, { job: WorkerJob; price: number; offerId?: string }>>({});
  const pendingOffersRef = useRef(pendingOffers);
  pendingOffersRef.current = pendingOffers;
  // Offers are upserted per (job, worker) server-side, so a cancel that lands
  // AFTER a re-offer would cancel the new offer. Serialise per job.
  const cancelInFlightRef = useRef<Record<string, Promise<void>>>({});
  // `at` makes every decline a new value, so two in a row both show.
  const [declinedNotice, setDeclinedNotice] = useState<{ name: string; at: number } | null>(null);
  // Public URL of the worker's uploaded photo, attached to each online ping
  const workerPhotoUrlRef = useRef<string | null>(null);
  // The account's profile picture, resolved once here rather than on every
  // visit to the account tab (which is a conditional render, so it remounts
  // and re-ran the whole lookup — including the remote restore — each time).
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // Worker's gender, so the backend only routes matching requests to them
  const workerGenderRef = useRef<string>("");

  useEffect(() => {
    getStoredUser().then(async u => {
      if (u?.gender) {
        workerGenderRef.current = u.gender;
        return;
      }
      // Older sessions saved no gender — fetch it once so preference routing works.
      if (u?.email) {
        const lookup = await findAccountByAuth(u.email, u.googleUid);
        if (lookup.account?.gender) {
          workerGenderRef.current = lookup.account.gender;
          await saveUser({ ...u, gender: lookup.account.gender });
        }
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUserId(name).then(id => {
      if (active) setWorkerId(id);
    });
    return () => {
      active = false;
    };
  }, [name]);

  // Refresh the completed-job count + rating when the worker id resolves and
  // whenever we return to the list (e.g. just after finishing/rating a job).
  // One account, one picture: both modes upload to the same object and read it
  // back from the same URL, so this restores whatever the account has.
  useEffect(() => {
    if (!workerId) return;
    let active = true;
    void (async () => {
      const stored = await getStoredUser();
      const ownerKey = avatarOwnerKeyFor(stored);
      const uri =
        (await getAvatar(ownerKey)) ??
        (await restoreAvatarFromRemote(ownerKey, workerPhotoUrl(workerId)));
      if (active) setPhotoUri(uri);
    })();
    return () => {
      active = false;
    };
  }, [workerId]);

  useEffect(() => {
    if (!workerId) return;
    let active = true;
    fetchWorkerEarnings(workerId).then(next => {
      if (active) setEarnings(next);
    });
    fetchWorkerStats(workerId).then(stats => {
      if (active) setWorkerRating(stats.rating);
    });
    return () => {
      active = false;
    };
  }, [workerId, activeJob]);

  // While online, hold one live marketplace socket: it registers our presence
  // (so we count as "viewing" requests) and streams the matching job feed —
  // replacing the old 8s poll. Closing it (offline / logout / background) marks
  // us offline server-side.
  const marketSocketRef = useRef<LiveSocket | null>(null);
  const lastCoordsRef = useRef<[number, number] | null>(null);
  // Pending "snooze is over, re-pull the feed" timers, cleared on unmount.
  const snoozeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // Lets toggleOnline rejoin the market once the photo upload finishes.
  const rejoinMarketRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      snoozeTimersRef.current.forEach(clearTimeout);
      snoozeTimersRef.current.clear();
    },
    [],
  );
  // Going online is the moment notifications MUST work. The launch-time sync
  // silently no-ops when it runs before login (no stored user yet), which left
  // workers with no push token at all — re-register every time we go online.
  // Storage hydrates asynchronously, so the very first mount of a cold start
  // can read `false` before the stored value lands. Pick it up when it does.
  useEffect(() => {
    if (isWorkerPresenceReady()) return;
    void hydrateWorkerPresence.then(() => setOnline(getWorkerOnline()));
  }, []);

  // Arrived by tapping a job notification: the feed is the only place that job
  // is actionable, so make sure that is the tab being looked at.
  const focusJobId = route.params?.focusJobId;
  useEffect(() => {
    if (focusJobId) setTab("jobs");
  }, [focusJobId]);

  useEffect(() => {
    setWorkerOnline(online);
  }, [online]);

  // A start skipped because the app was backgrounded (returning from the
  // "Allow all the time" settings screen) is retried on the next foreground.
  useEffect(() => watchAppStateForLocation(), []);

  /**
   * Leave the marketplace and keep trying until the server agrees.
   *
   * A failed request here is not a cosmetic loss: the worker stays available
   * for the full twelve-hour window, collecting job pushes they never asked
   * for. So the intent is written to disk first and cleared only on success.
   */
  const goOffline = async (id: string) => {
    await setPendingOffline(id);
    try {
      await markWorkerOffline(id);
      await setPendingOffline(null);
    } catch {
      // Left pending — retried on next launch and on the next foreground.
    }
  };

  // Retry an offline that never reached the server: no signal at the moment
  // they toggled, or the app was killed before the request finished.
  useEffect(() => {
    const flush = async () => {
      const pending = await getPendingOffline();
      if (!pending || online) return;
      try {
        await markWorkerOffline(pending);
        await setPendingOffline(null);
      } catch {
        // Still offline network-wise; try again next time.
      }
    };
    void flush();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void flush();
    });
    return () => sub.remove();
  }, [online]);

  // Online is restored from storage across restarts, and the permission can be
  // revoked in system settings between sessions. Without this, that worker
  // comes back "online" having bypassed the gate entirely.
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    void hasBackgroundLocationPermission().then(granted => {
      if (cancelled || granted) return;
      setOnline(false);
      setAlert({
        title: t("You've been set offline"),
        message: t(
          "Doyo needs \"{option}\" location to keep sending you jobs. Open settings and choose \"{option}\" to go back online.",
          { option: t(ALWAYS_LOCATION_OPTION) },
        ),
        buttons: [
          { label: t("Not now"), variant: "secondary" },
          {
            label: t("Open settings"),
            variant: "primary",
            onPress: () => void openBackgroundLocationSettings(),
          },
        ],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [online, t]);

  useEffect(() => {
    if (!online || !workerId) return;
    void syncPushNotifications(true).catch(() => undefined);
  }, [online, workerId]);

  useEffect(() => {
    if (!online || !workerId) {
      // The socket frame is a fast path, not the mechanism: `?.` on a dead
      // socket sends nothing, and presence now outlives the app by twelve
      // hours, so a missed offline leaves the worker receiving jobs with no
      // way out. goOffline() is the durable one and retries until accepted.
      marketSocketRef.current?.send({ type: "offline" });
      marketSocketRef.current?.close();
      marketSocketRef.current = null;
      // Marketplace-offline is NOT "stop publishing my position": accepting a
      // job sets online=false so a busy worker is offered no more work, but the
      // customer still needs the marker to move. Keep the location task alive
      // while a job is live.
      if (!activeJobRef.current) void stopWorkerLocationUpdates();
      setJobs([]);
      if (!workerId) return;

      void goOffline(workerId);

      // A channel join issued moments earlier can still land AFTER that
      // request, re-registering the worker it just removed — closing the
      // socket does not cancel a join already in flight. Re-assert once it has
      // had time to settle. Going back online re-runs this effect and clears
      // the timer, so this can never fight a deliberate reconnect.
      const reassertOffline = setTimeout(() => void goOffline(workerId), 4000);
      return () => clearTimeout(reassertOffline);
    }

    // Keeps the worker findable once the app is closed. Permission may be
    // missing — then they simply stay online at their last known position,
    // which the match radius mostly absorbs. Never block going online on it.
    void startWorkerLocationUpdates();

    let cancelled = false;
    let positionSubscription: { remove: () => void } | null = null;
    let currentCell: string | null = null;

    const cellFor = ([lng, lat]: [number, number]) =>
      `${Math.floor(lat / 0.06)}:${Math.floor(lng / 0.06)}`;
    const connect = (coordinates: [number, number]) => {
      marketSocketRef.current?.close();
      currentCell = cellFor(coordinates);
      const presence = {
        city: "islamabad",
        services: WORKER_SERVICES,
        gender: workerGenderRef.current || undefined,
        avatar: (workerGenderRef.current.toLowerCase().startsWith("f")
          ? "female"
          : "male") as "male" | "female",
        rating: workerRating,
        jobs: String(jobsCompleted),
        photo: workerPhotoUrlRef.current ?? undefined,
        name,
      };
      // The background heartbeat runs without a React tree, so its copy of
      // the profile has to be on disk before the app is backgrounded.
      void saveWorkerPresenceProfile({ workerId, ...presence });
      marketSocketRef.current = openMarketSocket(
        workerId,
        { ...presence, coordinates },
        { onJobs: setJobs },
      );
    };

    rejoinMarketRef.current = () => {
      const coordinates = lastCoordsRef.current;
      if (coordinates && !cancelled) connect(coordinates);
    };

    (async () => {
      // Connect on the FIRST usable fix. Waiting for a fresh GPS read used to
      // mean that a slow or denied fix left the worker completely absent from
      // the marketplace — no feed, no job pushes, no error anywhere.
      const cached = await getCurrentPosition();
      if (cancelled) return;
      if (cached) {
        lastCoordsRef.current = cached;
        connect(cached);
      }

      const fresh = await getFreshCurrentPosition();
      if (cancelled) return;
      if (fresh) {
        lastCoordsRef.current = fresh;
        if (!marketSocketRef.current || cellFor(fresh) !== currentCell) connect(fresh);
        else marketSocketRef.current.send({ type: "presence", coordinates: fresh });
      }

      // Keep marketplace presence aligned with the worker's actual device.
      // Crossing a shard boundary needs a new socket; within a shard the
      // lightweight presence message refreshes ETA and matching immediately.
      positionSubscription = await watchPosition(next => {
        if (cancelled) return;
        lastCoordsRef.current = next;
        if (cellFor(next) !== currentCell) connect(next);
        else marketSocketRef.current?.send({ type: "presence", coordinates: next });
      });
    })();

    // Presence safety net: an HTTP heartbeat keeps the worker in the
    // marketplace (and push-notifiable) even when the socket is dead —
    // backgrounded app, Doze, dropped Wi-Fi. Cheap, and independent of WS.
    const heartbeat = setInterval(() => {
      const coordinates = lastCoordsRef.current;
      if (!coordinates) return;
      markWorkerOnline(workerId, {
        city: "islamabad",
        services: WORKER_SERVICES,
        coordinates,
        gender: workerGenderRef.current || undefined,
        avatar: workerGenderRef.current.toLowerCase().startsWith("f") ? "female" : "male",
        rating: workerRating,
        jobs: String(jobsCompleted),
        photo: workerPhotoUrlRef.current ?? undefined,
        name,
      }).catch(() => undefined);
    }, 60_000);

    return () => {
      cancelled = true;
      rejoinMarketRef.current = null;
      clearInterval(heartbeat);
      positionSubscription?.remove();
      marketSocketRef.current?.close();
      marketSocketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, online, workerId]);

  // Reconcile with the server: what job does it think we're on?
  //
  // Being accepted arrives as a live socket event, and a backgrounded or closed
  // app has nothing listening — the worker then sits on an empty job list while
  // the customer tracks a cleaner who never got the message. Asking the server
  // on launch AND on every foreground makes that unmissable, whatever the
  // socket did.
  useEffect(() => {
    if (!workerId || workerId === "worker-local") return;
    let cancelled = false;

    const reconcile = async () => {
      let job = await fetchWorkerActiveJob(workerId);
      // undefined = server unreachable (cold start, no network). Retry rather
      // than concluding anything.
      for (let attempt = 0; job === undefined && attempt < 4 && !cancelled; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
        if (cancelled) return;
        job = await fetchWorkerActiveJob(workerId);
      }
      if (cancelled || job === undefined || !job) return;
      // Already on it — don't clobber live phase/price state with a re-fetch.
      if (activeJobRef.current?.id === job.id) return;
      setOnline(false);
      setJobs(curr => curr.filter(item => item.id !== job.id));
      setActiveJob(job);
    };

    void reconcile();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void reconcile();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  // Hardware back exits an active job back to the list instead of leaving
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused()) return false;
      if (activeJobRef.current) {
        setActiveJob(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  const tabs: TabDef[] = [
    { key: "jobs", label: t("Jobs"), Icon: Briefcase, badge: online ? jobs.length || undefined : undefined },
    { key: "earnings", label: t("Earnings"), Icon: Wallet },
    { key: "account", label: t("Account"), Icon: UserCircle },
    { key: "settings", label: t("Settings"), Icon: GearSix },
  ];

  // One live job-room socket per pending offer: it tells us the instant the
  // customer accepts (→ start the job) or the offer falls through (→ drop it).
  const offerSocketsRef = useRef<Record<string, LiveSocket>>({});
  useEffect(() => {
    const pendingIds = Object.keys(pendingOffers);

    for (const jobId of pendingIds) {
      if (offerSocketsRef.current[jobId]) continue;
      const dropPending = () =>
        setPendingOffers(curr => {
          const next = { ...curr };
          delete next[jobId];
          return next;
        });

      offerSocketsRef.current[jobId] = openJobRoomSocket(jobId, "worker", workerId, {
        // Declined = a deliberate "no" from the customer. Nothing is re-sent:
        // the card goes back to its bid state and stays there until the worker
        // chooses to offer again.
        onOfferDeclined: (_offerId, counter) => {
          const pending = pendingOffersRef.current[jobId];
          // Only while we're still bidding. Once a job is under way, a
          // customer cancelling it raised this toast too ("… declined your
          // offer") on top of the cancellation alert, which is both wrong and
          // redundant — the alert says it properly.
          if (pending && !activeJobRef.current && !counter) {
            setDeclinedNotice({
              name: pending.job.customerName.split(" ")[0] ?? t("The customer"),
              at: Date.now(),
            });
          }
          dropPending();
        },
        onState: (job, offers) => {
          if (!job) return;
          // Read live state, never the value captured when this socket opened —
          // the offerId arrives after the optimistic pending entry is set.
          const pending = pendingOffersRef.current[jobId];
          if (!pending) return;

          if (job.status === "assigned" && job.acceptedWorkerId === workerId) {
            dropPending();
            setOnline(false);
            setJobs(curr => curr.filter(item => item.id !== jobId));
            setActiveJob({ ...pending.job, price: job.acceptedPrice ?? pending.price });
            return;
          }

          // The REQUEST itself is gone — drop it off the feed.
          if (
            job.status === "cancelled" ||
            job.status === "expired" ||
            job.status === "completed" ||
            (job.status === "assigned" && job.acceptedWorkerId !== workerId)
          ) {
            dropPending();
            setJobs(curr => curr.filter(item => item.id !== jobId));
            return;
          }

          // Only OUR offer died (declined / expired / we cancelled it) while the
          // job is still open. Clear the pending badge but KEEP the request in
          // the feed so the worker can bid again — removing it here is what made
          // the whole job vanish after cancel + re-offer, with no way back short
          // of a market refresh.
          if (job.status === "open" && pending.offerId && !offers.some(o => o.id === pending.offerId)) {
            dropPending();
          }
        },
      });
    }

    // Tear down sockets for offers that are no longer pending.
    for (const jobId of Object.keys(offerSocketsRef.current)) {
      if (!pendingIds.includes(jobId)) {
        offerSocketsRef.current[jobId].close();
        delete offerSocketsRef.current[jobId];
      }
    }
  }, [pendingOffers, workerId]);

  // Close every pending-offer socket when the screen unmounts.
  useEffect(
    () => () => {
      Object.values(offerSocketsRef.current).forEach(socket => socket.close());
      offerSocketsRef.current = {};
    },
    [],
  );

  const dropPendingOffer = (jobId: string) =>
    setPendingOffers(curr => {
      if (!curr[jobId]) return curr;
      const next = { ...curr };
      delete next[jobId];
      return next;
    });

  const submitOfferAndWait = async (job: WorkerJob, agreedPrice: number): Promise<boolean> => {
    // Show "Waiting…" immediately; the offerId fills in when the server replies.
    // offerId cleared for the in-flight window: the old id must not trip the
    // "our offer disappeared" check while the replacement is being placed.
    setPendingOffers(curr => ({ ...curr, [job.id]: { ...curr[job.id], job, price: agreedPrice, offerId: undefined } }));
    try {
      // A cancel still in flight would land on the re-created offer row and kill
      // it (same offer id per job+worker). Let it finish first.
      await cancelInFlightRef.current[job.id];
    } catch {
      // A failed cancel is not a reason to block the new offer.
    }
    const coordinates = await getFreshCurrentPosition();
    if (!coordinates) {
      dropPendingOffer(job.id);
      return false;
    }
    try {
      const offer = await submitWorkerOffer(job.id, {
        workerId,
        workerName: name,
        coordinates,
        price: agreedPrice,
        workerRating,
        workerJobs: String(jobsCompleted),
      });
      setPendingOffers(curr =>
        // Cancelled while the request was in flight — don't resurrect it.
        curr[job.id] ? { ...curr, [job.id]: { job, price: agreedPrice, offerId: offer.id } } : curr,
      );
      return true;
    } catch {
      dropPendingOffer(job.id);
      return false;
    }
  };

  // Worker withdraws their pending offer — tell the server so the customer
  // stops seeing it, then drop our local pending state.
  const cancelOfferForJob = (jobId: string) => {
    const pending = pendingOffersRef.current[jobId];
    dropPendingOffer(jobId);
    if (!pending?.offerId) return;
    // Tracked so a re-offer can wait for it — see submitOfferAndWait.
    const request: Promise<void> = cancelWorkerOffer(jobId, pending.offerId, workerId)
      .catch(() => undefined)
      .then(() => {
        if (cancelInFlightRef.current[jobId] === request) delete cancelInFlightRef.current[jobId];
      });
    cancelInFlightRef.current[jobId] = request;
  };

  // Decline = a short breather from this card, not a permanent no. Hide it
  // locally, snooze it server-side, then pull the feed again once the window
  // passes so the request comes back while the customer is still searching.
  // (If the customer accepted someone meanwhile, the job is no longer open and
  // simply won't be in the feed.)
  const declineJob = (id: string) => {
    setJobs(curr => curr.filter(j => j.id !== id));
    dismissJobForWorker(id, workerId).catch(() => undefined);
    const timer = setTimeout(() => {
      snoozeTimersRef.current.delete(timer);
      const coordinates = lastCoordsRef.current;
      marketSocketRef.current?.send(
        coordinates ? { type: "ping", coordinates } : { type: "ping" },
      );
    }, DECLINE_SNOOZE_MS + 500);
    snoozeTimersRef.current.add(timer);
  };

  const finishActiveJob = () => setActiveJob(null);

  /**
   * "Allow all the time" or nothing.
   *
   * With only "while using the app" the worker looks online but their position
   * freezes the moment they close it, so they sit in the marketplace as a
   * stale dot. Inside one town the match radius hides that; across cities it
   * would silently send them jobs they are nowhere near. Gate it instead of
   * shipping a state that quietly lies.
   */
  const ensureBackgroundLocation = async (): Promise<boolean> => {
    if (await hasBackgroundLocationPermission()) return true;

    setAlert({
      title: t("Location access needed"),
      message: t(
        "Doyo needs \"{option}\" location to send you nearby jobs while the app is closed. Open settings and choose \"{option}\".",
        { option: t(ALWAYS_LOCATION_OPTION) },
      ),
      buttons: [
        { label: t("Not now"), variant: "secondary" },
        {
          label: t("Open settings"),
          variant: "primary",
          onPress: () => void openBackgroundLocationSettings(),
        },
      ],
    });
    return false;
  };

  const toggleOnline = async () => {
    if (online) {
      setOnline(false);
      return;
    }

    // Checked BEFORE the switch moves: going online without this permission is
    // not a degraded state we support.
    if (!(await ensureBackgroundLocation())) return;

    // Resolved BEFORE the switch moves, and before any socket exists.
    //
    // Going online opens the market socket, and a join issued optimistically
    // can still land AFTER the switch is reverted — re-registering the worker
    // the rollback just removed. A worker with no photo then sat available to
    // customers, counted in viewer totals and sent job pushes, while their own
    // app said offline and refused to let them on. Never start something a
    // known-failing check will have to undo.
    //
    // The cost is one local file read. `restoreAvatarFromRemote` only runs when
    // that file is missing — a reinstall — which is exactly the case that was
    // about to be blocked anyway.
    const user = await getStoredUser();
    const ownerKey = avatarOwnerKeyFor(user);
    // Resolved on mount; only look again if that had not landed yet.
    const photo =
      photoUri ??
      (await getAvatar(ownerKey)) ??
      (await restoreAvatarFromRemote(ownerKey, workerPhotoUrl(workerId)));
    // Review accounts sign in fresh with no local avatar, and their uploaded
    // photo lives under a different owner key — so this gate fired on an
    // account that cannot satisfy it, and stopped the worker demo at the door.
    const isReview = !!getCachedAppConfig().reviewLocation;
    if (!photo && !isReview) {
      setAlert({
        title: t("Profile picture required"),
        message: t("Add a profile picture before going online."),
      });
      return;
    }

    // Commission gate.
    //
    // The server refuses the market join too — this is not the enforcement,
    // it is the explanation. Without it the worker taps the toggle, the join
    // is rejected, and all they see is a switch that will not stay on.
    const owing = await fetchWorkerEarnings(workerId);
    if (owing.commissionDue >= WORKER_COMMISSION_LIMIT) {
      setAlert({
        title: t("Settle your commission"),
        message: t(
          "You owe PKR{due} in Doyo commission. Top up to start receiving jobs again.",
          { due: owing.commissionDue.toLocaleString() },
        ),
        buttons: [
          { label: t("Not now"), variant: "secondary" },
          { label: t("Open wallet"), variant: "primary", onPress: () => setTab("earnings") },
        ],
      });
      return;
    }

    // Started from the tap itself. A tap proves the app is on screen, which is
    // what Android demands before a foreground service may start — and it is a
    // far better guarantee than reading AppState afterwards, which is
    // documented to report "active" for a backgrounded app.
    void startWorkerLocationUpdates({ userGesture: true });

    // Flip the switch NOW. It used to wait on a profile-photo upload before
    // moving, so tapping it felt frozen for as long as the round trip took.
    // The upload below still runs — it just reverts this if it fails.
    setOnline(true);

    try {
      // A reviewer may be going online with no photo at all — skip the upload
      // rather than fail them out of the flow over a missing face.
      const photoUrl = photo ? await uploadWorkerPhoto(workerId, photo) : null;
      if (!photoUrl && !isReview) {
        setOnline(false);
        setAlert({
          title: t("Couldn't upload profile picture"),
          message: t("Please check your connection and try again."),
        });
        return;
      }

      // Presence was registered while the upload was still running, so rejoin
      // with the photo — otherwise customers see this worker without a face
      // until the next heartbeat.
      workerPhotoUrlRef.current = photoUrl;
      rejoinMarketRef.current?.();
    } catch {
      setOnline(false);
      setAlert({
        title: t("Couldn't go online"),
        message: t("Please check your connection and try again."),
      });
    }
  };

  /**
   * Look at the customer side instead. Not a downgrade — `role` and the
   * server-side approval are untouched, so coming back needs no
   * re-verification.
   *
   * Going offline first is deliberate: sitting in the marketplace while
   * browsing as a customer means jobs arriving for someone who isn't looking,
   * and an active job would have two sides of the same person.
   */
  const switchToCustomer = async () => {
    if (activeJob) {
      setAlert({
        title: t("Finish this job first"),
        message: t("You can switch to booking once your current job is complete."),
      });
      return;
    }

    setOnline(false);
    marketSocketRef.current?.send({ type: "offline" });
    marketSocketRef.current?.close();
    marketSocketRef.current = null;
    void stopWorkerLocationUpdates();
    if (workerId) await goOffline(workerId);

    const user = await setActiveMode("customer");
    navigation.reset({
      index: 0,
      routes: [{ name: "CustomerHome", params: { name: user?.name ?? "" } }],
    });
  };

  const handleLogout = async () => {
    // Logout = explicit offline: no grace window, no more job pushes. Over
    // HTTP as well as the socket, because presence outlives the app and a
    // frame sent on a dead socket leaves them online for hours.
    marketSocketRef.current?.send({ type: "offline" });
    marketSocketRef.current?.close();
    marketSocketRef.current = null;
    void stopWorkerLocationUpdates();
    if (workerId) await goOffline(workerId);
    await clearUser();
    navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
  };

  if (activeJob) {
    return (
      <ActiveJobView
        job={activeJob}
        workerId={workerId}
        paymentLabel={t(activeJob.payment)}
        onContact={() =>
          navigation.navigate("Chat", {
            workerName: activeJob.customerName,
            peerRole: "customer",
            jobId: activeJob.id,
            actorId: workerId,
            actorRole: "worker",
            peerPhoto: activeJob.customerPhoto,
          })
        }
        onExit={finishActiveJob}
      />
    );
  }

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style="light" />

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          {tab === "jobs" ? (
            <>
              <Text style={[s.headerGreeting, fontStyles.medium]}>{t("Welcome back")}</Text>
              <Text style={[s.headerName, fontStyles.bold]} numberOfLines={1}>
                {t("Hey, {name}", { name })}
              </Text>
            </>
          ) : (
            <Text style={[s.headerName, fontStyles.bold]} numberOfLines={1}>
              {t(TAB_TITLES[tab])}
            </Text>
          )}
        </View>
        {tab === "account" ? (
          <TouchableOpacity
            style={s.headerSupport}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Support")}
          >
            <Headset size={16} color={colors.white} weight="bold" />
            <Text style={[s.headerSupportText, fontStyles.semiBold]}>{t("Support")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FadeInView key={tab} delay={0} duration={300} style={{ flex: 1 }}>
        {tab === "jobs" ? (
          <JobsTab
            online={online}
            onToggleOnline={toggleOnline}
            jobs={jobs}
            pendingOffers={pendingOffers}
            notice={declinedNotice}
            onNoticeShown={() => setDeclinedNotice(null)}
            onSubmitOffer={submitOfferAndWait}
            onCancelOffer={cancelOfferForJob}
            onDecline={declineJob}
          />
        ) : tab === "earnings" ? (
          <EarningsTab workerId={workerId} initial={earnings} />
        ) : tab === "account" ? (
          <AccountTab
            name={name}
            workerId={workerId}
            jobsCompleted={jobsCompleted}
            rating={workerRating}
            photoUri={photoUri}
            onPhotoChange={setPhotoUri}
          />
        ) : (
          <WorkerSettingsTab onLogout={handleLogout} onSwitchToCustomer={switchToCustomer} />
        )}
      </FadeInView>

      <WorkerBottomNav tabs={tabs} active={tab} onChange={setTab} />
      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        buttons={
          alert?.buttons ??
          (alert?.title === t("Profile picture required")
            ? [
                {
                  label: t("Add profile picture"),
                  primary: true,
                  onPress: () => setTab("account"),
                },
                { label: t("Cancel") },
              ]
            : undefined)
        }
        onClose={() => setAlert(null)}
      />
    </ScreenBackground>
  );
}
