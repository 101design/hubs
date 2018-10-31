import nextTick from "./utils/next-tick.js";

// Manages web push subscriptions
//
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default class Subscriptions {
  constructor(hubId) {
    this.hubId = hubId;
  }

  setHubChannel = hubChannel => {
    this.hubChannel = hubChannel;
  };

  setRegistration = registration => {
    this.registration = registration;
  };

  setRegistrationFailed = () => {
    this.registration = null;
  };

  setVapidPublicKey = vapidPublicKey => {
    this.vapidPublicKey = vapidPublicKey;
  };

  setSubscribed = isSubscribed => {
    this._isSubscribed = isSubscribed;
  };

  isSubscribed = () => {
    return this._isSubscribed;
  };

  getCurrentEndpoint = async () => {
    if (!navigator.serviceWorker) return null;

    // registration becomes null if failed, non null if registered
    while (this.registration === undefined) await nextTick();
    if (!this.registration || !this.registration.pushManager) return null;
    if ((await this.registration.pushManager.permissionState()) !== "granted") return null;
    const sub = await this.registration.pushManager.getSubscription();
    if (!sub) return null;

    return sub.endpoint;
  };

  toggle = async () => {
    if (this._isSubscribed) {
      const pushSubscription = await this.registration.pushManager.getSubscription();
      const res = await this.hubChannel.unsubscribe(pushSubscription);

      if (res && res.has_remaining_subscriptions === false) {
        pushSubscription.unsubscribe();
      }
    } else {
      let pushSubscription = await this.registration.pushManager.getSubscription();

      if (!pushSubscription) {
        const convertedVapidKey = urlBase64ToUint8Array(this.vapidPublicKey);

        pushSubscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      this.hubChannel.subscribe(pushSubscription);
    }

    this._isSubscribed = !this._isSubscribed;
  };
}
