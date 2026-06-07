import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RoundResult } from '../App';
import { sfx } from '../game/audio';
import { ITEM_META, type ItemType } from '../game/items';
import { computeFreeMap, generateLevel, getLevelConfig, resetIds, type PileItem } from '../game/level';
import { PileScene } from '../game/Scene';
import type { SaveData } from '../game/store';

type BoosterKey = keyof SaveData['boosters'];

interface Props {
  level: number;
  boosters: SaveData['boosters'];
  updateBoosters: (b: Partial<SaveData['boosters']>) => void;
  coins: number;
  updateCoins: (delta: number) => void;
  onWin: (r: RoundResult) => void;
  onLose: (r: RoundResult) => void;
  onQuit: () => void;
}

interface TraySlot {
  id: number;
  type: ItemType;
}

interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

const GAME_BG = 'radial-gradient(ellipse at top, #ffd699 0%, #ff9a56 40%, #c2185b 100%)';
const PAUSE_BG = 'linear-gradient(180deg, #475569, #1e293b)';
const RESUME_BG = 'linear-gradient(180deg, #4ade80, #16a34a)';
const QUIT_BG = 'linear-gradient(180deg, #fb7185, #e11d48)';
const BOOSTER_ON_BG = 'linear-gradient(180deg, #fde047, #f59e0b)';
const BOOSTER_OFF_BG = 'linear-gradient(180deg, #cbd5e1, #94a3b8)';

let nextFloatingId = 1;

export default function GameScreen({
  level,
  boosters,
  updateBoosters,
  coins,
  updateCoins,
  onWin,
  onLose,
  onQuit,
}: Props) {
  const config = useMemo(() => getLevelConfig(level), [level]);
  const [items, setItems] = useState<PileItem[]>(() => {
    resetIds();
    return generateLevel(config);
  });
  const [tray, setTray] = useState<TraySlot[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<Array<{ item: PileItem; slot: TraySlot }>>([]);
  const [floating, setFloating] = useState<FloatingText[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [freezeLeft, setFreezeLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [showPause, setShowPause] = useState(false);

  const finishedRef = useRef(false);
  const comboTimerRef = useRef<number | null>(null);
  const winTimeRef = useRef<number | null>(null);
  const latestRef = useRef({ score: 0, comboCount: 0, maxCombo: 0, freezeLeft: 0 });

  const totalTime = config.time;
  const freeMap = useMemo(() => computeFreeMap(items), [items]);

  useEffect(() => {
    latestRef.current = { score, comboCount, maxCombo, freezeLeft };
  }, [score, comboCount, maxCombo, freezeLeft]);

  const createResult = useCallback(
    (stars: number, coinsEarned: number, finalTime: number): RoundResult => ({
      stars,
      score: latestRef.current.score,
      coinsEarned,
      combos: latestRef.current.comboCount,
      maxCombo: latestRef.current.maxCombo,
      timeLeft: finalTime,
      totalTime,
    }),
    [totalTime],
  );

  const addFloatingText = useCallback((text: string, color: string) => {
    const id = nextFloatingId++;
    const x = 50 + (Math.random() - 0.5) * 22;
    setFloating((list) => [...list, { id, text, color, x, y: 50 }]);
    window.setTimeout(() => setFloating((list) => list.filter((f) => f.id !== id)), 1200);
  }, []);

  const loseLevel = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStopped(true);
    sfx.lose();
    window.setTimeout(() => onLose(createResult(0, 0, 0)), 120);
  }, [createResult, onLose]);

  useEffect(() => {
    if (paused || stopped || finishedRef.current) return;

    const interval = window.setInterval(() => {
      if (stopped || finishedRef.current) return;

      setFreezeLeft((value) => Math.max(0, value - 0.1));
      setTimeLeft((current) => {
        if (latestRef.current.freezeLeft > 0.05) return current;
        const next = Math.max(0, current - 0.1);
        if (next <= 0) loseLevel();
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [loseLevel, paused, stopped]);

  const resetComboTimer = useCallback(() => {
    if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
    comboTimerRef.current = window.setTimeout(() => setCombo(0), 2500);
  }, []);

  const processMatch = useCallback(
    (currentTray: TraySlot[]) => {
      const groups: Partial<Record<ItemType, TraySlot[]>> = {};
      currentTray.forEach((slot) => {
        groups[slot.type] = [...(groups[slot.type] || []), slot];
      });

      const matchedType = (Object.keys(groups) as ItemType[]).find((type) => (groups[type]?.length || 0) >= 3);
      if (!matchedType) return false;

      const matchedSlots = (groups[matchedType] || []).slice(0, 3);
      const matchedIds = new Set(matchedSlots.map((slot) => slot.id));

      window.setTimeout(() => {
        setTray((oldTray) => oldTray.filter((slot) => !matchedIds.has(slot.id)));
      }, 180);

      setCombo((oldCombo) => {
        const nextCombo = oldCombo + 1;
        const points = nextCombo === 1 ? 100 : nextCombo === 2 ? 250 : nextCombo === 3 ? 500 : 500 + (nextCombo - 3) * 250;

        setScore((oldScore) => oldScore + points);
        setComboCount((count) => count + 1);
        setMaxCombo((best) => Math.max(best, nextCombo));
        addFloatingText(`+${points}${nextCombo > 1 ? ` x${nextCombo}` : ''}`, nextCombo > 1 ? '#ffd93d' : '#ffffff');

        if (nextCombo > 1) {
          sfx.combo(nextCombo);
          updateCoins(5 * nextCombo);
          addFloatingText(`COMBO x${nextCombo}`, '#f472b6');
        } else {
          sfx.match();
        }

        resetComboTimer();
        return nextCombo;
      });

      return true;
    },
    [addFloatingText, resetComboTimer, updateCoins],
  );

  const addToTray = useCallback(
    (item: PileItem) => {
      const slot: TraySlot = { id: item.id, type: item.type };

      setTray((oldTray) => {
        const nextTray = [...oldTray];
        const lastSame = nextTray.map((traySlot) => traySlot.type).lastIndexOf(slot.type);
        if (lastSame >= 0) nextTray.splice(lastSame + 1, 0, slot);
        else nextTray.push(slot);

        setHistory((list) => [...list, { item, slot }]);

        window.setTimeout(() => {
          setTray((currentTray) => {
            const matched = processMatch(currentTray);
            if (!matched && currentTray.length >= 7) loseLevel();
            else if (!matched && currentTray.length >= 6) sfx.danger();
            else if (!matched && currentTray.length >= 5) sfx.warn();
            return currentTray;
          });
        }, 240);

        return nextTray;
      });
    },
    [loseLevel, processMatch],
  );

  const tapItem = useCallback(
    (id: number) => {
      if (finishedRef.current || paused || stopped || tray.length >= 7 || !freeMap[id]) return;

      const item = items.find((candidate) => candidate.id === id);
      if (!item) return;

      sfx.pickup();
      setRemovingIds((old) => new Set(old).add(id));

      window.setTimeout(() => {
        setItems((oldItems) => oldItems.filter((candidate) => candidate.id !== id));
        setRemovingIds((old) => {
          const next = new Set(old);
          next.delete(id);
          return next;
        });
      }, 360);

      addToTray(item);
    },
    [addToTray, freeMap, items, paused, stopped, tray.length],
  );

  useEffect(() => {
    if (finishedRef.current || items.length !== 0) return;

    if (winTimeRef.current === null) {
      winTimeRef.current = timeLeft;
      setStopped(true);
    }

    const timeout = window.setTimeout(() => {
      if (finishedRef.current) return;
      if (items.length === 0 && tray.length === 0 && removingIds.size === 0) {
        finishedRef.current = true;
        const finalTime = winTimeRef.current ?? timeLeft;
        const ratio = finalTime / totalTime;
        const stars = ratio > 0.5 ? 3 : ratio > 0.2 ? 2 : 1;
        const coinsEarned = 50 + stars * 30 + latestRef.current.comboCount * 5;

        sfx.win();
        window.setTimeout(() => onWin(createResult(stars, coinsEarned, finalTime)), 420);
      }
    }, 620);

    return () => window.clearTimeout(timeout);
  }, [createResult, items.length, onWin, removingIds.size, timeLeft, totalTime, tray.length]);

  const spendBooster = useCallback(
    (key: BoosterKey) => {
      if (boosters[key] <= 0) return false;
      updateBoosters({ [key]: boosters[key] - 1 });
      return true;
    },
    [boosters, updateBoosters],
  );

  const useUndo = () => {
    const last = history[history.length - 1];
    if (!last || !spendBooster('undo')) return;
    setHistory((list) => list.slice(0, -1));
    setTray((oldTray) => oldTray.filter((slot) => slot.id !== last.slot.id));
    setItems((oldItems) => [...oldItems, last.item]);
  };

  const useShuffle = () => {
    if (!spendBooster('shuffle')) return;
    sfx.shuffle();
    setItems((oldItems) => {
      const types = oldItems.map((item) => item.type);
      for (let i = types.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      return oldItems.map((item, index) => ({ ...item, type: types[index] }));
    });
  };

  const useMagnet = () => {
    if (boosters.magnet <= 0) return;

    const freeByType: Partial<Record<ItemType, PileItem[]>> = {};
    items.forEach((item) => {
      if (freeMap[item.id]) freeByType[item.type] = [...(freeByType[item.type] || []), item];
    });

    const trayCount: Partial<Record<ItemType, number>> = {};
    tray.forEach((slot) => {
      trayCount[slot.type] = (trayCount[slot.type] || 0) + 1;
    });

    const chosenType = (Object.keys(freeByType) as ItemType[]).find((type) => {
      const needed = Math.max(0, 3 - (trayCount[type] || 0));
      return (freeByType[type]?.length || 0) >= needed;
    });

    if (!chosenType || !spendBooster('magnet')) return;

    const needed = Math.max(0, 3 - (trayCount[chosenType] || 0));
    (freeByType[chosenType] || []).slice(0, needed).forEach((item, index) => {
      window.setTimeout(() => tapItem(item.id), index * 130);
    });
  };

  const useFreeze = () => {
    if (!spendBooster('freeze')) return;
    setFreezeLeft((value) => value + 10);
    addFloatingText('FREEZE 10s', '#7dd3fc');
    sfx.freeze();
  };

  const timePercent = Math.max(0, (timeLeft / totalTime) * 100);
  const trayWarning = tray.length === 5;
  const trayDanger = tray.length >= 6;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: GAME_BG }}>
      <header className="relative z-20 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setPaused(true);
              setShowPause(true);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-black btn-3d"
            style={{ background: PAUSE_BG, boxShadow: '0 3px 0 #0f172a' }}
          >
            ||
          </button>

          <div className="flex-1 mx-2">
            <div className="flex justify-between text-xs text-white/90 font-bold mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              <span>LEVEL {level}</span>
              <span>{Math.ceil(timeLeft)}s {freezeLeft > 0 ? 'FROZEN' : ''}</span>
            </div>
            <div className={timePercent < 25 ? 'h-4 rounded-full overflow-hidden danger-glow' : 'h-4 rounded-full overflow-hidden'} style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${timePercent}%`,
                  background: freezeLeft > 0 ? 'linear-gradient(90deg, #7dd3fc, #38bdf8)' : timePercent < 25 ? 'linear-gradient(90deg, #fca5a5, #ef4444)' : 'linear-gradient(90deg, #86efac, #22c55e, #fde047)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full text-white font-black text-xs" style={{ background: 'rgba(0,0,0,0.4)' }}>
            COINS {coins}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <HudPill label="SCORE" value={score.toLocaleString()} />
          <div className="flex gap-0.5">
            {[0, 1, 2].map((index) => {
              const ratio = timeLeft / totalTime;
              const active = index === 2 ? ratio > 0.5 : index === 1 ? ratio > 0.2 : ratio > 0;
              return (
                <span key={index} className="text-lg font-black" style={{ color: active ? '#fde047' : '#94a3b8', textShadow: active ? '0 0 8px rgba(255,220,0,0.9)' : 'none' }}>
                  STAR
                </span>
              );
            })}
          </div>
          <HudPill label="LEFT" value={items.length.toString()} />
        </div>

        {combo >= 2 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-20 px-4 py-1 rounded-full font-black text-white text-lg pop-in" style={{ background: 'linear-gradient(90deg, #ec4899, #f59e0b)', boxShadow: '0 4px 15px rgba(236,72,153,0.6)' }}>
            COMBO x{combo}
          </div>
        )}
      </header>

      <main className="relative flex-1">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 7, 7], fov: 38 }} gl={{ antialias: true, alpha: true }}>
          <PileScene items={items} freeMap={freeMap} removingIds={removingIds} onTap={tapItem} />
        </Canvas>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floating.map((entry) => (
            <div key={entry.id} className="absolute font-black text-2xl float-up" style={{ left: `${entry.x}%`, top: `${entry.y}%`, color: entry.color, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {entry.text}
            </div>
          ))}
        </div>
      </main>

      <section className="relative z-20 px-3 py-2 flex justify-center gap-2">
        <BoosterBtn icon="UNDO" label="Undo" count={boosters.undo} onClick={useUndo} />
        <BoosterBtn icon="SHUF" label="Shuffle" count={boosters.shuffle} onClick={useShuffle} />
        <BoosterBtn icon="MAG" label="Magnet" count={boosters.magnet} onClick={useMagnet} />
        <BoosterBtn icon="TIME" label="Freeze" count={boosters.freeze} onClick={useFreeze} />
      </section>

      <section
        className="relative z-20 mx-3 mb-4 p-3 rounded-3xl"
        style={{
          background: trayDanger ? 'linear-gradient(180deg, #fee2e2, #fecaca)' : trayWarning ? 'linear-gradient(180deg, #fef3c7, #fde68a)' : 'linear-gradient(180deg, #ede9fe, #ddd6fe)',
          boxShadow: '0 6px 0 rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
          border: trayDanger ? '3px solid #ef4444' : trayWarning ? '3px solid #f59e0b' : '3px solid #8b5cf6',
        }}
      >
        <div className={trayDanger ? 'grid grid-cols-7 gap-1 danger-glow' : trayWarning ? 'grid grid-cols-7 gap-1 warn-glow' : 'grid grid-cols-7 gap-1'}>
          {Array.from({ length: 7 }).map((_, index) => {
            const slot = tray[index];
            const color = slot ? ITEM_META[slot.type].color : '#ffffff';
            return (
              <div
                key={index}
                className="aspect-square rounded-xl flex items-center justify-center pop-in"
                style={{
                  background: slot ? `linear-gradient(180deg, ${color}55, ${color}aa)` : 'rgba(255,255,255,0.4)',
                  boxShadow: slot ? `0 3px 0 ${color}` : 'inset 0 2px 4px rgba(0,0,0,0.15)',
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              >
                {slot && <span className="text-3xl">{ITEM_META[slot.type].emoji}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {showPause && (
        <PauseOverlay
          onResume={() => {
            sfx.click();
            setPaused(false);
            setShowPause(false);
          }}
          onQuit={() => {
            sfx.click();
            onQuit();
          }}
        />
      )}
    </div>
  );
}

function HudPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1 rounded-xl text-white font-black flex items-center gap-1" style={{ background: 'rgba(0,0,0,0.35)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
      <span className="text-xs opacity-80">{label}</span>
      <span className="text-base">{value}</span>
    </div>
  );
}

function BoosterBtn({ icon, label, count, onClick }: { icon: string; label: string; count: number; onClick: () => void }) {
  const disabled = count <= 0;
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          sfx.click();
          onClick();
        }
      }}
      disabled={disabled}
      className="relative flex flex-col items-center justify-center rounded-2xl btn-3d"
      style={{
        width: 64,
        height: 64,
        background: disabled ? BOOSTER_OFF_BG : BOOSTER_ON_BG,
        boxShadow: disabled ? '0 3px 0 #475569' : '0 4px 0 #78350f, 0 6px 10px rgba(0,0,0,0.2)',
        border: 'none',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span className="text-[11px] font-black text-amber-950">{icon}</span>
      <span className="text-[10px] font-black text-amber-900 mt-0.5">{label}</span>
      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center border-2 border-white">
        {count}
      </span>
    </button>
  );
}

function PauseOverlay({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl p-6 w-72 text-center" style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.3)' }}>
        <h2 className="text-2xl font-black text-purple-700 mb-4">Paused</h2>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={onResume} className="py-2.5 rounded-2xl font-black text-white text-lg btn-3d" style={{ background: RESUME_BG, boxShadow: '0 4px 0 #14532d' }}>
            Resume
          </button>
          <button type="button" onClick={onQuit} className="py-2.5 rounded-2xl font-black text-white text-lg btn-3d" style={{ background: QUIT_BG, boxShadow: '0 4px 0 #881337' }}>
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
