import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { SampleTalent } from "./sampleTalent";
import { DamageHudData, DamageHudTarget, TotalDamage } from "../data";
import { LancerActor } from "../../../actor/lancer-actor";
import { LancerItem } from "../../../item/lancer-item";

//Manual checkbox
export default class Juggernaut_2 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Kinetic Mass Transfer", "-");
  slug: string = slugify("Kinetic Mass Transfer", "-");
  humanLabel: string = "Kinetic Mass Transfer";
  quickReference: string = "1d6";
  tooltip: string =
    "1/round, if you Ram a target into an obstruction large enough to stop their movement, your target takes 1d6 kinetic damage.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Juggernaut_2, unknown, unknown> {
    return enclass(this.schemaCodec, Juggernaut_2);
  }

  //Perhaps don't initialize at all if talent not applicable?
  static perRoll(item?: LancerItem | LancerActor): Juggernaut_2 {
    let ret = new Juggernaut_2();
    return ret;
  }

  modifyDamages(
    damages: {
      shared: TotalDamage;
      individual: TotalDamage;
    },
    target?: DamageHudTarget
  ): { shared: TotalDamage; individual: TotalDamage } {
    if (!this.active) return damages;

    let sharedDamageSlice = damages.shared.damage.slice();

    sharedDamageSlice.push({ type: DamageType.Kinetic, val: "1d6" });
    return {
      shared: {
        damage: sharedDamageSlice,
        bonusDamage: damages.shared.bonusDamage,
      },
      individual: damages.individual,
    };
  }

  isVisible(data: DamageHudData, target?: DamageHudTarget): boolean {
    //This talent does not apply to tech attacks
    if (data.base.tech) return false;

    return true;
  }
}
