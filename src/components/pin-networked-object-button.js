import { getPromotionTokenForFile } from "../utils/media-utils";

AFRAME.registerComponent("pin-networked-object-button", {
  schema: {
    // Selector for label to change when pinned/unpinned, must be sibling of this components element
    labelSelector: { type: "string" },

    // Selector for items to hide iff pinned
    hideWhenPinnedSelector: { type: "string" }
  },

  init() {
    this._updateUI = this._updateUI.bind(this);
    this._updateUIOnStateChange = this._updateUIOnStateChange.bind(this);
    this.el.sceneEl.addEventListener("stateadded", this._updateUIOnStateChange);
    this.el.sceneEl.addEventListener("stateremoved", this._updateUIOnStateChange);

    this.labelEl = this.el.parentNode.querySelector(this.data.labelSelector);

    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
      this.targetEl = networkedEl;

      this._updateUI();
      this.targetEl.addEventListener("pinned", this._updateUI);
      this.targetEl.addEventListener("unpinned", this._updateUI);
    });

    this.onClick = () => {
      if (!NAF.utils.isMine(this.targetEl) && !NAF.utils.takeOwnership(this.targetEl)) return;

      const wasPinned = this.targetEl.components.pinnable && this.targetEl.components.pinnable.data.pinned;
      this.targetEl.setAttribute("pinnable", "pinned", !wasPinned);
    };
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  },

  remove() {
    this.el.sceneEl.removeEventListener("stateadded", this._updateUIOnStateChange);
    this.el.sceneEl.removeEventListener("stateremoved", this._updateUIOnStateChange);

    if (this.targetEl) {
      this.targetEl.removeEventListener("pinned", this._updateUI);
      this.targetEl.removeEventListener("unpinned", this._updateUI);
    }
  },

  _updateUIOnStateChange(e) {
    if (e.detail !== "frozen") return;
    this._updateUI();
  },

  _updateUI() {
    const { fileIsOwned, fileId } = this.targetEl.components["media-loader"].data;
    const canPin = !!(fileIsOwned || (fileId && getPromotionTokenForFile(fileId)));
    this.el.setAttribute("visible", canPin);
    this.labelEl.setAttribute("visible", canPin);
    if (!canPin) return;

    const isPinned = this.targetEl.getAttribute("pinnable") && this.targetEl.getAttribute("pinnable").pinned;

    this.labelEl.setAttribute("text", "value", isPinned ? "un-pin" : "pin");
    this.el.setAttribute("text-button", "backgroundColor", isPinned ? "#fff" : "#ff3550");
    this.el.setAttribute("text-button", "backgroundHoverColor", isPinned ? "#bbb" : "#fc3545");

    this.el.parentNode.querySelectorAll(this.data.hideWhenPinnedSelector).forEach(hideEl => {
      hideEl.setAttribute("visible", !isPinned);
    });
  }
});
