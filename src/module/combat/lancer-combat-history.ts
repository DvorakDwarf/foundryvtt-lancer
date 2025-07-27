import { LancerActor } from "../actor/lancer-actor";
import { Cover } from "../apps/acc_diff";
import { LANCER } from "../config";
import { FittingSize, WeaponType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { BoundedNum } from "../source-template";
import { LancerCombatant } from "./lancer-combat";

//Whenever an AccDiff is submitted, history is appended

//Perhaps should be a type + class
function getStats(actor?: LancerActor | null): {
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
} {
  const heat = actor?.hasHeatcap() ? actor.system.heat : undefined;

  const structure = actor?.is_mech() || actor?.is_npc() ? actor.system.structure : undefined;

  const stress = actor?.is_mech() || actor?.is_npc() ? actor.system.stress : undefined;

  const hp = actor?.system.hp;

  return {
    hp,
    heat,
    structure,
    stress,
  };
}

//We redefine targets/base/weapon to avoid infinite recursion from token/plugins
type HistoryTarget = {
  actorUUID: string;
  targetId: string;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  consumeLockOn: boolean;
  prone: boolean;
  stunned: boolean;
  // As of the beginning of the action
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
};

type HistoryWeapon = {
  mount: FittingSize | null;
  weaponType: WeaponType | null;
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
};

type HistoryBase = {
  grit: number;
  flatBonus: number;
  accuracy: number;
  difficulty: number;
  cover: Cover;
};

export type HistoryHitResult = {
  total: number;
  usedLockOn: boolean;
  hit: boolean;
  crit: boolean;
};

//Could record movement here?
type HistoryAction = {
  weapon: HistoryWeapon;
  targets: HistoryTarget[];
  base: HistoryBase;
  type: string;
  hit_results: HistoryHitResult[];
  // Both of these are as of the beginning of the action
  // The action-taker's stats
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
};

type HistoryTurn = {
  combatant: LancerCombatant;
  actions: HistoryAction[];
};

type HistoryRound = {
  turns: HistoryTurn[];
};

export class LancerCombatHistory {
  rounds: HistoryRound[];
  constructor(rounds?: HistoryRound[]) {
    this.rounds = rounds ? rounds : [];
  }
  get currentRound(): HistoryRound {
    return this.rounds[this.rounds.length - 1];
  }

  getCurrentActorTurn(actorUUID?: string | null): HistoryTurn | undefined {
    return this.currentRound.turns.find((turn: HistoryTurn) => {
      return turn.combatant.actor?.uuid === actorUUID;
    });
  }
  // getCurrentActorTurn() preferred
  getCurrentCombatantTurn(combatantId?: string | null): HistoryTurn | undefined {
    return this.currentRound.turns.find((turn: HistoryTurn) => {
      return turn.combatant.id === combatantId;
    });
  }

  newRound() {
    this.rounds.push({ turns: [] });
  }
  undoRound() {
    this.rounds.pop();
  }

  newTurn(combatant: LancerCombatant | undefined) {
    if (!combatant) return;

    this.currentRound.turns.push({
      combatant,
      actions: [],
    });
  }
  undoTurn(combatant: LancerCombatant | undefined) {
    if (!combatant) return;

    this.currentRound.turns = this.currentRound.turns.filter((turn: HistoryTurn) => {
      //Fallback to combatant id
      if (!turn.combatant.actor || !combatant.actor) {
        return turn.combatant.id !== combatant.id;
      } else {
        return turn.combatant.actor.uuid !== combatant.actor.uuid;
      }
    });
  }

  dataToAction(
    data:
      | LancerFlowState.AttackRollData
      | LancerFlowState.WeaponRollData
      | LancerFlowState.StatRollData
      | LancerFlowState.TechAttackRollData
  ): HistoryAction {
    if (!data.acc_diff) throw new TypeError(`Accuracy/difficulty data missing!`);

    const acc_diff = data.acc_diff;

    const newTargets: HistoryTarget[] = acc_diff.targets.map(target => {
      const stats = getStats(target.target.actor);
      return {
        actorUUID: target.target.actor!.uuid, //Can this be undefined?
        targetId: target.target.id,
        accuracy: target.accuracy,
        difficulty: target.difficulty,
        cover: target.cover,
        consumeLockOn: target.consumeLockOn,
        prone: target.prone,
        stunned: target.stunned,
        hp: stats.hp,
        heat: stats.heat,
        structure: stats.structure,
        stress: stats.stress,
        // ...target leads to recursion :(,
      };
    });

    const newWeapon = {
      mount: acc_diff.weapon.mount,
      weaponType: acc_diff.weapon.weaponType,
      accurate: acc_diff.weapon.accurate,
      inaccurate: acc_diff.weapon.inaccurate,
      seeking: acc_diff.weapon.seeking,
      engaged: acc_diff.weapon.engaged,

      // same with ...acc_diff.weapon
    };

    const newBase = {
      grit: acc_diff.base.grit,
      flatBonus: acc_diff.base.flatBonus,
      accuracy: acc_diff.base.accuracy,
      difficulty: acc_diff.base.difficulty,
      cover: acc_diff.base.cover,
    };

    let newHitResults: HistoryHitResult[] = [];
    if (data.type !== "stat") {
      newHitResults = data?.hit_results.map(result => {
        return {
          total: parseInt(result.total), //Can it be float?
          usedLockOn: result.usedLockOn,
          hit: result.hit,
          crit: result.crit,
        };
      });
    }

    const stats = getStats(acc_diff.lancerActor);
    return {
      weapon: newWeapon,
      targets: newTargets,
      base: newBase,
      type: data.type,
      hit_results: newHitResults,
      hp: stats.hp,
      heat: stats.heat,
      structure: stats.structure,
      stress: stats.stress,
    };
  }
  newAction(
    data:
      | LancerFlowState.AttackRollData
      | LancerFlowState.WeaponRollData
      | LancerFlowState.StatRollData
      | LancerFlowState.TechAttackRollData
  ) {
    if (!data.acc_diff) {
      console.error(`${LANCER.log_prefix} Cannot serialize action to combat history. Accuracy/difficulty data missing!`);
      return;
    }

    const action = this.dataToAction(data);

    const actorUUID = data.acc_diff.lancerActor?.uuid;
    if (typeof actorUUID !== "string") return;

    for (let turn of this.currentRound.turns) {
      if (turn.combatant.actor?.uuid !== actorUUID) continue;

      turn.actions.push(action);
      break;
    }
  }

  getAllActorActions(actorUUID: string | null): HistoryAction[] {
    let actions = [];
    for (const round of this.rounds) {
      for (const turn of round.turns) {
        if (turn.combatant.actor?.uuid !== actorUUID) continue;
        for (const action of turn.actions) {
          actions.push(action);
        }
      }
    }

    return actions;
  }
  getAllCombatantActions(combatantId: string | null): HistoryAction[] {
    let actions = [];
    for (const round of this.rounds) {
      for (const turn of round.turns) {
        if (turn.combatant.id !== combatantId) continue;
        for (const action of turn.actions) {
          actions.push(action);
        }
      }
    }

    return actions;
  }
}
