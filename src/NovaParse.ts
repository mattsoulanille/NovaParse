import * as fs from "fs";
import * as path from "path";
import { GameDataInterface } from "novadatainterface/GameDataInterface";
import { NovaDataInterface, NovaDataType, NovaIDNotFoundError } from "novadatainterface/NovaDataInterface";
import { IDSpaceHandler } from "./IDSpaceHandler";
import { NovaResources, NovaResourceType } from "./ResourceHolderBase"
import { Gettable } from "novadatainterface/Gettable";
import { BaseData } from "novadatainterface/BaseData";
import { BaseResource } from "./resourceParsers/NovaResourceBase";
import { ShipParseClosure, ShipPictMap } from "./parsers/ShipParse";
import { ShipResource } from "./resourceParsers/ShipResource";
import { resourceIDNotFoundStrict, resourceIDNotFoundWarn } from "./parsers/ResourceIDNotFound";
import { ShipData } from "../../NovaDataInterface/ShipData";
import { DefaultAnimation } from "../../NovaDataInterface/Animation";

type ParseFunction<T extends BaseResource, O extends BaseData> = (resource: T, errorFunc: (message: string) => void) => Promise<O>;

class NovaParse implements GameDataInterface {
    shipParser: (s: ShipResource, m: (message: string) => void) => Promise<ShipData>;

    private shipPICTMap: ShipPictMap;
    resourceNotFoundFunction: (message: string) => void;
    public data: NovaDataInterface;
    path: string
    private ids: IDSpaceHandler;
    public readonly idSpace: Promise<NovaResources>;

    constructor(dataPath: string, strict: boolean = true) {

        // Strict will throw an error if any resource is not found.
        // Otherwise, it will try to substitute default resources whenever possible (success may vary).
        if (strict) {
            this.resourceNotFoundFunction = resourceIDNotFoundStrict;
        }
        else {
            this.resourceNotFoundFunction = resourceIDNotFoundWarn;
        }

        this.path = path.join(dataPath);
        this.ids = new IDSpaceHandler(dataPath);
        this.idSpace = this.ids.getIDSpace();
        this.shipPICTMap = this.makeShipPictMap();
        this.shipParser = ShipParseClosure(this.shipPICTMap);
        this.data = this.buildData();

    }

    // Assigns all the gettables to this.data
    private buildData(): NovaDataInterface {
        // This should really use NovaDataType.Ship etc but that isn't allowed when constructing like this.
        var data = {
            "Ship": this.makeGettable<ShipResource, ShipData>(NovaResourceType.shïp, this.shipParser)
            //	    "Outfit": this.makeGettable<OutfitResource, OutfitData>(NovaResourceType.shïp, )
        }

        return data;
    }

    makeGettable<T extends BaseResource, O extends BaseData>(resourceType: NovaResourceType, parseFunction: ParseFunction<T, O>): Gettable<O> {
        return new Gettable(async (id: string) => {
            var idSpace = await this.idSpace;
            var resource = <T>idSpace[resourceType][id];

            if (typeof resource === "undefined") {
                throw new NovaIDNotFoundError("NovaParse could not find " + resourceType + " of ID " + id + ".");
            }

            return await parseFunction(resource, this.resourceNotFoundFunction);
        });
    }

    // shïps whose corresponding PICT does not exist
    // use the PICT of the first shïp that had the same baseImage ID
    private async makeShipPictMap(): ShipPictMap {
        var idSpace = await this.idSpace;

        // Maps shïp ids to their baseImage ids
        var shipPICTMap: { [index: string]: string } = {};

        // maps baseImage ids to pict ids
        var baseImagePICTMap: { [index: string]: string } = {};

        // Populate baseImagePICTMap
        for (let shipGlobalID in idSpace.shïp) {
            var ship = idSpace.shïp[shipGlobalID];
            var pict = ship.idSpace.PICT[ship.pictID];

            if (!pict) {
                continue; // Ship has no corresponding pict, so don't set anything.
            }

            var shan = ship.idSpace.shän[ship.id];
            if (!shan) {
                this.resourceNotFoundFunction("shïp id " + ship.globalID + " missing shan");
                continue; // If it's not found, there's no baseImage to map from
            }
            var baseImageLocalID = shan.images.baseImage.ID;
            var baseImageGlobalID = shan.idSpace.rlëD[baseImageLocalID].globalID;

            // Don't overwrite if it already exists. The first ship with the
            // baseImage determines the PICT
            if (!baseImagePICTMap[baseImageGlobalID]) {
                // The base image corresponds to this pict.
                baseImagePICTMap[baseImageGlobalID] = pict.globalID;
            }
        }

        // Populate shipPICTMap
        for (let shipGlobalID in idSpace.shïp) {
            var ship = idSpace.shïp[shipGlobalID];
            var pict = ship.idSpace.PICT[ship.pictID];

            if (pict) {
                // Then there is a pict for this ship.
                // Set it in the map.
                shipPICTMap[shipGlobalID] = pict.globalID;
            }
            else {
                // No pict found for this ship, so look up the first
                // ship's baseImage in the baseImagePICTMap
                var shan = ship.idSpace.shän[ship.id];
                var baseImageLocalID = shan.images.baseImage.ID;
                var baseImageGlobalID = shan.idSpace.rlëD[baseImageLocalID].globalID;
                shipPICTMap[shipGlobalID] = baseImagePICTMap[baseImageGlobalID];
            }
        }
        return shipPICTMap;
    }

}


export { NovaParse };