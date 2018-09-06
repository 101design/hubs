import React, { Component } from "react";
import { FormattedMessage } from "react-intl";
import DialogContainer from "./dialog-container.js";

export default class HelpDialog extends Component {
  render() {
    return (
      <DialogContainer title="Getting Started" {...this.props}>
        <div className="info-dialog__help">
          <p>When in a room, other avatars can see and hear you.</p>
          <p>
            Use your controller&apos;s action button to teleport from place to place. If it has a trigger, use it to
            pick up objects.
          </p>
          <p style={{ textAlign: "center" }}>
            In VR, <b>look up</b> to find your menu:
            <img
              className="info-dialog__help__hud"
              src="../assets/images/help-hud.png"
              srcSet="../assets/images/help-hud@2x.png 2x"
            />
          </p>
          <p>
            The <b>Mic Toggle</b> mutes your mic.
          </p>
          <p>
            The <b>Pause/Resume Toggle</b> pauses all other avatars. You can then block them from having further
            interactions with you.
          </p>
          <p>
            The <b>Bubble Toggle</b> hides avatars that enter your personal space.
          </p>
          <p className="dialog__box__contents__links">
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/mozilla/hubs/blob/master/TERMS.md">
              <FormattedMessage id="profile.terms_of_use" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/mozilla/hubs/blob/master/PRIVACY.md">
              <FormattedMessage id="profile.privacy_notice" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href="/?report">
              <FormattedMessage id="help.report_issue" />
            </a>
          </p>
        </div>
      </DialogContainer>
    );
  }
}
