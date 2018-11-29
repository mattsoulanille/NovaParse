
import { NovaDataInterface, NovaDataType } from "novadatainterface/NovaDataInterface";
import { ShipData, ShipProperties } from "novadatainterface/ShipData";
import { DefaultPictData } from "novadatainterface/PictData";
import { ExplosionData } from "novadatainterface/ExplosionData";
import { BaseParse } from "./BaseParse";
import { NovaResources } from "../ResourceHolderBase";
import { ShipResource } from "../resourceParsers/ShipResource";
import { BaseData } from "novadatainterface/BaseData";
import { Animation, DefaultAnimation } from "novadatainterface/Animation";
import { ShanParse } from "./ShanParse";
import { DescResource } from "../resourceParsers/DescResource";
import { FPS, TurnRateConversionFactor } from "./Constants";

type ShipPictMap = Promise<{ [index: string]: string }>;

function ShipParseClosure(shipPictMap: ShipPictMap): (s: ShipResource, m: (message: string) => void) => Promise<ShipData> {
    // Returns the function ShipParse with shipPictMap already assigned

    return function(ship: ShipResource, notFoundFunction: (m: string) => void) {
        return ShipParse(ship, notFoundFunction, shipPictMap);
    }
}



async function ShipParse(ship: ShipResource, notFoundFunction: (message: string) => void, shipPictMap: ShipPictMap): Promise<ShipData> {

    var base: BaseData = await BaseParse(ship, notFoundFunction);

    var desc: string;
    var descResource = ship.idSpace.dësc[ship.descID];
    if (descResource) {
        desc = descResource.text;
    }
    else {
        desc = "No matching dësc for shïp of id " + base.id;
        notFoundFunction(desc);
    }

    // TODO: Parse Explosions
    var initialExplosionID: string | null = null;
    var finalExplosionID: string | null = null;

    // Refactor into a function? Eh, there's only 2 of them.
    if (ship.initialExplosion !== null) {
        let boom = ship.idSpace.bööm[ship.initialExplosion]
        if (boom) {
            initialExplosionID = boom.globalID;
        }
        else {
            notFoundFunction("shïp id " + base.id + " missing bööm of id " + ship.initialExplosion);
        }
    }

    if (ship.finalExplosion !== null) {
        let boom = ship.idSpace.bööm[ship.finalExplosion]
        if (boom) {
            finalExplosionID = boom.globalID;
        }
        else {
            notFoundFunction("shïp id " + base.id + " missing bööm of id " + ship.finalExplosion);
        }
    }


    var shanResource = ship.idSpace.shän[ship.id];
    var animation: Animation;
    if (shanResource) {
        animation = await ShanParse(shanResource, notFoundFunction);
    }
    else {
        notFoundFunction("No matching shän for shïp of id " + base.id);
        animation = DefaultAnimation;
    }



    var pictID: string;
    var pict = ship.idSpace.PICT[ship.pictID]
    if (pict) {
        pictID = pict.globalID;
    }
    else {
        pictID = (await shipPictMap)[base.id];
        if (!pictID) {
            notFoundFunction("No matching PICT for ship of id " + base.id);
            pictID = DefaultPictData.id;
        }
    }

    var properties: ShipProperties = {
        shield: ship.shield,
        shieldRecharge: ship.shieldRecharge * FPS / 1000, // Recharge per second
        armor: ship.armor,
        armorRecharge: ship.armorRecharge * FPS / 1000,
        energy: ship.energy,
        energyRecharge: FPS / ship.energyRecharge, // Frames per unit -> units per second
        ionization: ship.ionization,
        deionize: ship.deionize / 100 * FPS, // 100 is 1 point of ion energy per 1/30th of a second (evn bible)
        speed: ship.speed, // TODO: Figure out the correct scaling factor for these
        acceleration: ship.acceleration,
        turnRate: ship.turnRate * TurnRateConversionFactor,
        mass: ship.mass,
        freeMass: 0,
    }

    return {
        properties,
        pictID: pictID,
        desc: desc,
        outfits: {}, //TODO: Parse Outfits
        initialExplosion: initialExplosionID,
        finalExplosion: finalExplosionID,
        deathDelay: ship.deathDelay / FPS,
        largeExplosion: ship.deathDelay >= 60,
        displayWeight: ship.id, // TODO: Fix this once displayweight is implemented
        animation,
        ...base
    }
}

export { ShipParse, ShipParseClosure, ShipPictMap };