/**
 * NPC Logic Tests
 *
 * Unit tests for the NPC system that do not require the full Phaser runtime:
 * - NPC_CONFIGS data integrity (all 4 NPCs with correct shape)
 * - promptText() logic (quest done / has item / lacks item)
 * - interact() quest state transitions (item consumed, XP awarded, reward granted)
 * - Zone JSON NPC object entries (presence, npcId, dimensions)
 *
 * Phaser import boundary: NPC class is NOT imported directly because it
 * instantiates a Phaser.Physics.Matter.Sprite in its constructor. Instead,
 * NPC_CONFIGS is inlined and the promptText/interact logic is exercised by
 * constructing a minimal mock scene and calling those methods directly on a
 * plain object that mirrors the NPC instance interface.
 * Keep NPC_CONFIGS in sync with src/gameobjects/npc.js.
 */

import { describe, it, expect } from 'vitest';
import zone1 from '../public/assets/maps/zone1.json';
import zone2 from '../public/assets/maps/zone2.json';
import zone3 from '../public/assets/maps/zone3.json';
import zone4 from '../public/assets/maps/zone4.json';

// ── NPC_CONFIGS — inlined from src/gameobjects/npc.js ────────────────────────
// Keep this in sync with the source file.

const NPC_CONFIGS = {
  harvey: {
    name: 'Harvey',
    tint: 0xdd9955,
    dialog: 'Need Copper Wiring — got any?',
    doneDialog: 'You\'re a legend. Go launch that thing!',
    quest: {
      wantLabel: 'Copper Wiring',
      reward: { xp: 30, item: { label: 'Solenoid Valve', type: 'ingredient', tint: 0x88aaff } }
    }
  },
  maria: {
    name: 'Maria',
    tint: 0x8899cc,
    dialog: 'Bring me a Multi-tool and I\'ll make it worth your while.',
    doneDialog: 'Side entrance is faster — good luck out there!',
    quest: {
      wantLabel: 'Multi-tool',
      reward: { xp: 30, item: { label: 'Steel Bracket', type: 'ingredient', tint: 0xaaaaaa } }
    }
  },
  dale: {
    name: 'Old Dale',
    tint: 0x99aa77,
    dialog: 'A Road Flare for an old man? I\'ll give you somethin\' useful.',
    doneDialog: 'Storm eye passes soon. You got this, son.',
    quest: {
      wantLabel: 'Road Flare',
      reward: { xp: 40 }
    }
  },
  reeves: {
    name: 'Coach Reeves',
    tint: 0x4488cc,
    dialog: 'Hydraulic Seal. Chem lab stays locked until you bring one.',
    doneDialog: 'Lab\'s open! Pressure Gauge inside — go go go!',
    quest: {
      wantLabel: 'Hydraulic Seal',
      reward: { xp: 35, item: { label: 'Pressure Gauge', type: 'ingredient', tint: 0xffaa44 } }
    }
  }
};

// ── Mock scene factory ────────────────────────────────────────────────────────
// Mirrors the minimal interface required by NPC.promptText() and NPC.interact().

const makeScene = (registryData = {}) => ({
  registry: {
    get: (key) => registryData[key],
    set: (key, val) => { registryData[key] = val; },
  },
  cameras: { main: { shake: () => {} } },
  showXPGain: () => {},
  showPoints: () => {},
});

// ── NPC instance factory ──────────────────────────────────────────────────────
// Constructs a plain object that mirrors the NPC instance structure without
// touching the Phaser constructor or _generateTexture().

const makeNPC = (npcId, scene) => ({
  scene,
  _npcId: npcId,
  _config: NPC_CONFIGS[npcId],
  sprite: { x: 100, y: 200, destroy: () => {} },
  promptText() {
    const quests = this.scene.registry.get('npcQuests') ?? {};
    if (quests[this._npcId]) return '';
    const inv = this.scene.registry.get('inventory') ?? [];
    const hasItem = inv.some(i => i.label === this._config.quest.wantLabel);
    if (hasItem) return `[E] Give ${this._config.quest.wantLabel}`;
    return `[E] Talk to ${this._config.name}`;
  },
  interact() {
    const quests = this.scene.registry.get('npcQuests') ?? {};
    if (quests[this._npcId]) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, this._config.doneDialog, 0xffdd00);
      return;
    }
    const wantLabel = this._config.quest.wantLabel;
    const inv = this.scene.registry.get('inventory') ?? [];
    const idx = inv.findIndex(i => i.label === wantLabel);
    if (idx !== -1) {
      let removed = false;
      const newInv = inv.filter(item => {
        if (!removed && item.label === wantLabel) { removed = true; return false; }
        return true;
      });
      this.scene.registry.set('inventory', newInv);
      const xp = this.scene.registry.get('xp') ?? 0;
      this.scene.registry.set('xp', xp + this._config.quest.reward.xp);
      this.scene.showXPGain(this.sprite.x, this.sprite.y - 40, this._config.quest.reward.xp, 'loot');
      if (this._config.quest.reward.item) {
        const updatedInv = this.scene.registry.get('inventory') ?? [];
        this.scene.registry.set('inventory', [...updatedInv, this._config.quest.reward.item]);
      }
      const npcQuests = this.scene.registry.get('npcQuests') ?? {};
      npcQuests[this._npcId] = true;
      this.scene.registry.set('npcQuests', npcQuests);
      this.scene.registry.set('hudToast', `QUEST COMPLETE — ${this._config.name}|${Date.now()}`);
      this.scene.cameras.main.shake(120, 0.006);
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, this._config.doneDialog, 0x00eeff);
      return;
    }
    this.scene.showPoints(this.sprite.x, this.sprite.y - 20, this._config.dialog, 0xffffff);
  },
});

// ── Helper: find NPC objects in a zone JSON ───────────────────────────────────

const findNPCObjects = (zoneJson) =>
  zoneJson.layers
    .flatMap(layer => layer.objects ?? [])
    .filter(obj => obj.type === 'npc');

const getNpcIdProp = (obj) =>
  (obj.properties ?? []).find(p => p.name === 'npcId')?.value;

// ── 1. NPC_CONFIGS integrity ──────────────────────────────────────────────────

describe('NPC_CONFIGS integrity', () => {
  const NPC_KEYS = ['harvey', 'maria', 'dale', 'reeves'];

  it('has exactly the 4 expected NPC keys', () => {
    expect(Object.keys(NPC_CONFIGS)).toEqual(NPC_KEYS);
  });

  NPC_KEYS.forEach(id => {
    describe(`NPC "${id}"`, () => {
      const cfg = NPC_CONFIGS[id];

      it('has a non-empty name string', () => {
        expect(typeof cfg.name).toBe('string');
        expect(cfg.name.length).toBeGreaterThan(0);
      });

      it('has a numeric tint value', () => {
        expect(typeof cfg.tint).toBe('number');
      });

      it('has a non-empty dialog string', () => {
        expect(typeof cfg.dialog).toBe('string');
        expect(cfg.dialog.length).toBeGreaterThan(0);
      });

      it('has a non-empty doneDialog string', () => {
        expect(typeof cfg.doneDialog).toBe('string');
        expect(cfg.doneDialog.length).toBeGreaterThan(0);
      });

      it('quest.wantLabel is a non-empty string', () => {
        expect(typeof cfg.quest.wantLabel).toBe('string');
        expect(cfg.quest.wantLabel.length).toBeGreaterThan(0);
      });

      it('quest.reward.xp is a positive number', () => {
        expect(typeof cfg.quest.reward.xp).toBe('number');
        expect(cfg.quest.reward.xp).toBeGreaterThan(0);
      });
    });
  });

  it('harvey reward item has label, type, and tint', () => {
    const item = NPC_CONFIGS.harvey.quest.reward.item;
    expect(item).toBeDefined();
    expect(typeof item.label).toBe('string');
    expect(item.label.length).toBeGreaterThan(0);
    expect(typeof item.type).toBe('string');
    expect(typeof item.tint).toBe('number');
  });

  it('maria reward item has label, type, and tint', () => {
    const item = NPC_CONFIGS.maria.quest.reward.item;
    expect(item).toBeDefined();
    expect(typeof item.label).toBe('string');
    expect(item.label.length).toBeGreaterThan(0);
    expect(typeof item.type).toBe('string');
    expect(typeof item.tint).toBe('number');
  });

  it('dale has no reward item (xp-only reward)', () => {
    expect(NPC_CONFIGS.dale.quest.reward.item).toBeUndefined();
  });

  it('reeves reward item has label, type, and tint', () => {
    const item = NPC_CONFIGS.reeves.quest.reward.item;
    expect(item).toBeDefined();
    expect(typeof item.label).toBe('string');
    expect(item.label.length).toBeGreaterThan(0);
    expect(typeof item.type).toBe('string');
    expect(typeof item.tint).toBe('number');
  });
});

// ── 2. promptText() logic ─────────────────────────────────────────────────────

describe('NPC.promptText() — quest done', () => {
  it('returns empty string when quest is already marked done', () => {
    const reg = { npcQuests: { harvey: true }, inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    expect(npc.promptText()).toBe('');
  });

  it('returns empty string for other NPCs when their quest is done', () => {
    const reg = { npcQuests: { maria: true }, inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('maria', scene);
    expect(npc.promptText()).toBe('');
  });
});

describe('NPC.promptText() — player has item', () => {
  it('returns "[E] Give <wantLabel>" when inventory contains required item', () => {
    const reg = {
      npcQuests: {},
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    expect(npc.promptText()).toBe('[E] Give Copper Wiring');
  });

  it('matches on label only — extra items in inventory do not interfere', () => {
    const reg = {
      npcQuests: {},
      inventory: [
        { label: 'Junk Item', type: 'junk' },
        { label: 'Multi-tool', type: 'ingredient' },
        { label: 'Another Junk', type: 'junk' },
      ],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('maria', scene);
    expect(npc.promptText()).toBe('[E] Give Multi-tool');
  });
});

describe('NPC.promptText() — player lacks item', () => {
  it('returns "[E] Talk to <name>" when inventory is empty', () => {
    const reg = { npcQuests: {}, inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    expect(npc.promptText()).toBe('[E] Talk to Harvey');
  });

  it('returns "[E] Talk to <name>" when inventory has items but not the right one', () => {
    const reg = {
      npcQuests: {},
      inventory: [{ label: 'Steel Bracket', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('dale', scene);
    expect(npc.promptText()).toBe('[E] Talk to Old Dale');
  });

  it('npcQuests undefined in registry treated as no quests done', () => {
    // registry.get('npcQuests') returns undefined — nullish coalesce must handle it
    const reg = { inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('reeves', scene);
    expect(npc.promptText()).toBe('[E] Talk to Coach Reeves');
  });

  it('inventory undefined in registry treated as empty', () => {
    const reg = { npcQuests: {} };
    const scene = makeScene(reg);
    const npc = makeNPC('maria', scene);
    expect(npc.promptText()).toBe('[E] Talk to Maria');
  });
});

// ── 3. interact() — quest state transitions ───────────────────────────────────

describe('NPC.interact() — player has the required item', () => {
  it('removes the required item from inventory', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    expect(reg.inventory.some(i => i.label === 'Copper Wiring')).toBe(false);
  });

  it('removes only one copy when multiple copies are in inventory', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [
        { label: 'Copper Wiring', type: 'ingredient' },
        { label: 'Copper Wiring', type: 'ingredient' },
      ],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    const remaining = reg.inventory.filter(i => i.label === 'Copper Wiring');
    expect(remaining).toHaveLength(1);
  });

  it('awards the correct XP amount', () => {
    const reg = {
      npcQuests: {},
      xp: 10,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    expect(reg.xp).toBe(10 + NPC_CONFIGS.harvey.quest.reward.xp); // 10 + 30 = 40
  });

  it('awards XP starting from 0 when no prior XP exists', () => {
    const reg = {
      npcQuests: {},
      inventory: [{ label: 'Multi-tool', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('maria', scene);
    npc.interact();
    expect(reg.xp).toBe(NPC_CONFIGS.maria.quest.reward.xp); // 30
  });

  it('marks the quest as done in registry', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    expect(reg.npcQuests.harvey).toBe(true);
  });

  it('adds reward item to inventory when reward has an item (harvey)', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    const rewardItem = reg.inventory.find(i => i.label === 'Solenoid Valve');
    expect(rewardItem).toBeDefined();
    expect(rewardItem.type).toBe('ingredient');
  });

  it('adds reward item for reeves (Pressure Gauge)', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Hydraulic Seal', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('reeves', scene);
    npc.interact();
    const rewardItem = reg.inventory.find(i => i.label === 'Pressure Gauge');
    expect(rewardItem).toBeDefined();
  });

  it('does NOT add a reward item for dale (xp-only reward)', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Road Flare', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('dale', scene);
    const invBefore = reg.inventory.length;
    npc.interact();
    // Item was removed (1 gone) and no reward item added: inventory should be empty
    expect(reg.inventory).toHaveLength(invBefore - 1);
  });

  it('sets hudToast in registry with quest-complete message', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Road Flare', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('dale', scene);
    npc.interact();
    expect(typeof reg.hudToast).toBe('string');
    expect(reg.hudToast).toContain('QUEST COMPLETE');
    expect(reg.hudToast).toContain('Old Dale');
  });

  it('does not affect other NPC quest flags when one quest completes', () => {
    const reg = {
      npcQuests: { maria: true },
      xp: 0,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    // harvey should be done, maria should still be done, others untouched
    expect(reg.npcQuests.harvey).toBe(true);
    expect(reg.npcQuests.maria).toBe(true);
    expect(reg.npcQuests.dale).toBeUndefined();
  });
});

describe('NPC.interact() — player lacks the required item', () => {
  it('does NOT mark quest done when player has no item', () => {
    const reg = { npcQuests: {}, xp: 0, inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    expect(reg.npcQuests.harvey).toBeUndefined();
  });

  it('does NOT change XP when player has no item', () => {
    const reg = { npcQuests: {}, xp: 50, inventory: [] };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    npc.interact();
    expect(reg.xp).toBe(50);
  });

  it('does NOT change inventory when player has no item', () => {
    const reg = {
      npcQuests: {},
      xp: 0,
      inventory: [{ label: 'Steel Bracket', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene); // wants Copper Wiring, not Steel Bracket
    npc.interact();
    expect(reg.inventory).toHaveLength(1);
    expect(reg.inventory[0].label).toBe('Steel Bracket');
  });
});

describe('NPC.interact() — quest already done', () => {
  it('does NOT mutate npcQuests registry when quest is already done', () => {
    const reg = {
      npcQuests: { harvey: true },
      xp: 100,
      inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('harvey', scene);
    const questsBefore = { ...reg.npcQuests };
    npc.interact();
    expect(reg.npcQuests).toEqual(questsBefore);
  });

  it('does NOT change XP when quest is already done', () => {
    const reg = {
      npcQuests: { maria: true },
      xp: 75,
      inventory: [{ label: 'Multi-tool', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('maria', scene);
    npc.interact();
    expect(reg.xp).toBe(75);
  });

  it('does NOT consume inventory item when quest is already done', () => {
    const reg = {
      npcQuests: { dale: true },
      xp: 0,
      inventory: [{ label: 'Road Flare', type: 'ingredient' }],
    };
    const scene = makeScene(reg);
    const npc = makeNPC('dale', scene);
    npc.interact();
    expect(reg.inventory).toHaveLength(1);
    expect(reg.inventory[0].label).toBe('Road Flare');
  });
});

// ── 4. Zone JSON NPC entries ──────────────────────────────────────────────────

describe('Zone JSON NPC entries', () => {
  it('zone1.json has exactly 1 NPC object', () => {
    expect(findNPCObjects(zone1)).toHaveLength(1);
  });

  it('zone1.json NPC has npcId="harvey"', () => {
    const [npcObj] = findNPCObjects(zone1);
    expect(getNpcIdProp(npcObj)).toBe('harvey');
  });

  it('zone1.json NPC has width=32 and height=48', () => {
    const [npcObj] = findNPCObjects(zone1);
    expect(npcObj.width).toBe(32);
    expect(npcObj.height).toBe(48);
  });

  it('zone2.json has exactly 1 NPC object', () => {
    expect(findNPCObjects(zone2)).toHaveLength(1);
  });

  it('zone2.json NPC has npcId="maria"', () => {
    const [npcObj] = findNPCObjects(zone2);
    expect(getNpcIdProp(npcObj)).toBe('maria');
  });

  it('zone2.json NPC has width=32 and height=48', () => {
    const [npcObj] = findNPCObjects(zone2);
    expect(npcObj.width).toBe(32);
    expect(npcObj.height).toBe(48);
  });

  it('zone3.json has exactly 1 NPC object', () => {
    expect(findNPCObjects(zone3)).toHaveLength(1);
  });

  it('zone3.json NPC has npcId="dale"', () => {
    const [npcObj] = findNPCObjects(zone3);
    expect(getNpcIdProp(npcObj)).toBe('dale');
  });

  it('zone3.json NPC has width=32 and height=48', () => {
    const [npcObj] = findNPCObjects(zone3);
    expect(npcObj.width).toBe(32);
    expect(npcObj.height).toBe(48);
  });

  it('zone4.json has exactly 1 NPC object', () => {
    expect(findNPCObjects(zone4)).toHaveLength(1);
  });

  it('zone4.json NPC has npcId="reeves"', () => {
    const [npcObj] = findNPCObjects(zone4);
    expect(getNpcIdProp(npcObj)).toBe('reeves');
  });

  it('zone4.json NPC has width=32 and height=48', () => {
    const [npcObj] = findNPCObjects(zone4);
    expect(npcObj.width).toBe(32);
    expect(npcObj.height).toBe(48);
  });

  it('each zone NPC npcId maps to a known NPC_CONFIGS entry', () => {
    const zones = [zone1, zone2, zone3, zone4];
    for (const zone of zones) {
      for (const npcObj of findNPCObjects(zone)) {
        const npcId = getNpcIdProp(npcObj);
        expect(NPC_CONFIGS).toHaveProperty(npcId);
      }
    }
  });
});
