// limitations under the License.

import { ITrackElement } from "../types/EditorTypes";
import { TrackElement } from "./TrackElement";
import { BaseElement } from "./BaseElement";

export abstract class ClickableBaseElement extends BaseElement {

    mouseDown(ev: MouseEvent) {
    }

    mouseUp(ev: MouseEvent) {
    }

    
}