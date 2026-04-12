// ── NPC Configs ───────────────────────────────────────────────────────────────

const NPC_CONFIGS = {
  harvey: {
    name: 'Harvey',
    tint: 0xdd9955,           // warm brown (plaid shirt)
    dialog: 'Need Copper Wiring — got any?',
    doneDialog: 'You\'re a legend. Go launch that thing!',
    quest: {
      wantLabel: 'Copper Wiring',
      reward: { xp: 200, item: { label: 'Solenoid Valve', type: 'ingredient', tint: 0x88aaff } }
    }
  },
  maria: {
    name: 'Maria',
    tint: 0x8899cc,           // blue-purple (library vest)
    dialog: 'Bring me a Multi-tool and I\'ll make it worth your while.',
    doneDialog: 'Side entrance is faster — good luck out there!',
    quest: {
      wantLabel: 'Multi-tool',
      reward: { xp: 200, item: { label: 'Steel Bracket', type: 'ingredient', tint: 0xaaaaaa } }
    }
  },
  dale: {
    name: 'Old Dale',
    tint: 0x99aa77,           // olive (ranger vest)
    dialog: 'A Road Flare for an old man? I\'ll give you somethin\' useful.',
    doneDialog: 'Storm eye passes soon. You got this, son.',
    quest: {
      wantLabel: 'Road Flare',
      reward: { xp: 200 }
    }
  },
  reeves: {
    name: 'Coach Reeves',
    tint: 0x4488cc,           // blue (coach polo)
    dialog: 'Hydraulic Seal. Chem lab stays locked until you bring one.',
    doneDialog: 'Lab\'s open! Pressure Gauge inside — go go go!',
    quest: {
      wantLabel: 'Hydraulic Seal',
      reward: { xp: 200, item: { label: 'Pressure Gauge', type: 'ingredient', tint: 0xffaa44 } }
    }
  }
};

// ── NPC ───────────────────────────────────────────────────────────────────────

export default class NPC {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x
   * @param {number}       y
   * @param {string}       npcId  - key into NPC_CONFIGS
   */
  constructor(scene, x, y, npcId) {
    this.scene    = scene;
    this._npcId   = npcId;
    this._config  = NPC_CONFIGS[npcId];

    this._generateTexture(scene, npcId, this._config.tint);

    this.sprite = scene.matter.add.sprite(x, y, `npc_${npcId}`, 0, { isStatic: true });
    this.sprite.setFixedRotation();
    this.sprite.setDepth(9);

    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Texture ──────────────────────────────────────────────────────────────────

  _generateTexture(scene, npcId, tint) {
    if (scene.textures.exists(`npc_${npcId}`)) return;
    const g = scene.make.graphics({ add: false });
    // Body (32x36 rectangle from y=12)
    g.fillStyle(tint);
    g.fillRect(4, 12, 24, 36);
    // Head (24x12 rect from y=0)
    g.fillStyle(0xf5c5a0); // skin tone
    g.fillRect(8, 0, 16, 14);
    g.generateTexture(`npc_${npcId}`, 32, 48);
    g.destroy();
  }

  // ── Interactable interface ────────────────────────────────────────────────────

  promptText() {
    const quests = this.scene.registry.get('npcQuests') ?? {};
    if (quests[this._npcId]) return '';

    const inv = this.scene.registry.get('inventory') ?? [];
    const hasItem = inv.some(i => i.label === this._config.quest.wantLabel);
    if (hasItem) return `[E] Give ${this._config.quest.wantLabel}`;

    return `[E] Talk to ${this._config.name}`;
  }

  interact() {
    const quests = this.scene.registry.get('npcQuests') ?? {};

    // State 1: Quest already done
    if (quests[this._npcId]) {
      this.scene.showPoints(
        this.sprite.x, this.sprite.y - 20,
        this._config.doneDialog,
        0xffdd00
      );
      return;
    }

    const wantLabel = this._config.quest.wantLabel;
    const inv = this.scene.registry.get('inventory') ?? [];
    const idx = inv.findIndex(i => i.label === wantLabel);

    // State 2: Player has the required item
    if (idx !== -1) {
      // Remove item from inventory
      let removed = false;
      const newInv = inv.filter(item => {
        if (!removed && item.label === wantLabel) { removed = true; return false; }
        return true;
      });
      this.scene.registry.set('inventory', newInv);

      // Award XP
      const xp = this.scene.registry.get('xp') ?? 0;
      this.scene.registry.set('xp', xp + this._config.quest.reward.xp);
      this.scene.showXPGain(
        this.sprite.x, this.sprite.y - 40,
        this._config.quest.reward.xp,
        'quest'
      );

      // Add reward item if present
      if (this._config.quest.reward.item) {
        const updatedInv = this.scene.registry.get('inventory') ?? [];
        this.scene.registry.set('inventory', [...updatedInv, this._config.quest.reward.item]);
      }

      // Mark quest done
      const npcQuests = this.scene.registry.get('npcQuests') ?? {};
      npcQuests[this._npcId] = true;
      this.scene.registry.set('npcQuests', npcQuests);

      // HUD toast
      this.scene.registry.set('hudToast', `QUEST COMPLETE — ${this._config.name}|${Date.now()}`);

      // Camera shake
      this.scene.cameras.main.shake(120, 0.006);

      // Done dialog in cyan
      this.scene.showPoints(
        this.sprite.x, this.sprite.y - 20,
        this._config.doneDialog,
        0x00eeff
      );
      return;
    }

    // State 3: Player does NOT have the required item
    this.scene.showPoints(
      this.sprite.x, this.sprite.y - 20,
      this._config.dialog,
      0xffffff
    );
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    this.sprite?.destroy();
    this.sprite = null;
  }
}
