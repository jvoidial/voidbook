# Installing SQWAK.app on an iPhone (unsigned IPA)

The `Build sqawk (iOS, unsigned IPA)` workflow produces `sqawk-unsigned.ipa`,
an unsigned build of the app. "Unsigned" means it carries no Apple signature, so
iOS will not launch it until something signs it with a certificate — either a
sideloading tool using your own Apple ID, or TrollStore, which installs unsigned
apps by design.

This is for putting the app on **your own device**. A sideloading tool signs with
a personal certificate, which is not a licence to distribute the app to other
people. See [Caveats](#caveats) at the end.

---

## 1. Download the IPA

1. Open the repository's **Actions** tab.
2. Pick the latest **Build sqawk (iOS, unsigned IPA)** run (green tick).
3. Under **Artifacts**, download `sqawk-unsigned.ipa` and unzip it if your
   browser saved it as a `.zip`.

Artifacts expire after 30 days, so re-run the workflow if the download is gone.

Only use the IPA from your own Actions run. An unsigned IPA can be modified by
anyone before it reaches you, and there is no signature to detect that.

---

## 2. Pick a method

| Method | Re-signing needed | Works on | Effort |
|---|---|---|---|
| **SideStore / AltStore** | Yes, every 7 days (free ID) | iOS 12.2+ (varies) | Medium |
| **Sideloadly** | Yes, every 7 days (free ID) | iOS 12+ | Low, needs a computer |
| **TrollStore** | **No, permanent** | Only specific iOS versions | High setup, best result |

Check your iOS version first: **Settings → General → About → Software Version**.
That number decides which of these you can use.

---

## 3. TrollStore — permanent, but only on some versions

TrollStore installs unsigned apps without a certificate and without expiry. If
your device is supported, this is by far the best option.

**Compatibility.** The original instruction said "iOS 16.6.1 and below". That is
close but not exact, and it is the kind of thing that changes over time. As
generally documented, TrollStore covers roughly:

- iOS 14.0 – 15.4.1
- iOS 15.5 – 16.6.1
- iOS 17.0

It does **not** work on iOS 16.7.1 or later, iOS 17.0.1 or later, or iOS 18 / 26.
I could not verify the current table while writing this (search was
unavailable), so confirm your exact version against the official list before
installing anything:

<https://github.com/opa334/TrollStore> — see the compatibility table in the README.

**If you are compatible:**

1. Install TrollStore using the installer matching your version (for example
   TrollInstallerX or TrollRestore). The repository above links the current
   method for each version; follow it exactly, as the steps differ per version.
2. Open TrollStore, tap the **+** icon, and choose `sqawk-unsigned.ipa`.
3. It installs immediately and never expires.

If your version is not on the list, use SideStore or Sideloadly instead.

---

## 4. SideStore / AltStore — refresh every 7 days

Both work the same way: a helper signs the IPA with your free Apple ID and
installs it over Wi-Fi. AltStore needs a computer running AltServer; SideStore is
the fork that refreshes on-device.

1. Install the helper by following its own guide (this step is the fiddly part
   and differs per iOS version):
   - AltStore: <https://altstore.io>
   - SideStore: <https://sidestore.io>
2. In the app, sign in with your **Apple ID**. A free account is fine. Two-factor
   auth is supported; if you use an app-specific password, generate one at
   <https://appleid.apple.com>.
3. Use **+** / **My Apps → +** and select `sqawk-unsigned.ipa`.
4. The app installs and appears on your home screen.

**The 7-day rule.** A free Apple ID signs apps for 7 days. After that the app
stops opening until you refresh it in AltStore/SideStore. A paid Apple Developer
account ($99/year) extends this to a year. A free account can also have at most 3
sideloaded apps installed at once.

---

## 5. Sideloadly — manual, desktop

1. Install Sideloadly from <https://sideloadly.io> on Windows or macOS.
2. Connect your iPhone by cable and trust the computer.
3. Drag `sqawk-unsigned.ipa` into Sideloadly.
4. Enter your Apple ID, click **Start**, and wait for it to sign and install.
5. The app appears on your home screen; it expires in 7 days like the above.

---

## 6. Trust the developer profile

Whichever method you use, the first launch will be blocked until you trust the
certificate:

1. On the iPhone, open **Settings → General → VPN & Device Management**.
2. Under **Developer App**, tap your Apple ID.
3. Tap **Trust**, then confirm.

The app should now open. If it still will not launch, the signature has expired —
refresh it with the tool you used.

---

## Caveats

- **7-day expiry.** Free Apple ID signatures last 7 days. Plan to refresh, or use
  TrollStore if your device supports it.
- **Certificate revocation.** Apple can revoke a free certificate it considers
  abused, which stops every app signed with it from opening until you re-sign.
- **Personal use only.** Sideloading is intended for installing apps on your own
  device. Distributing a signed build to other people runs against Apple's
  developer agreement, and a free certificate is not licensed for it. If you want
  to ship SQWAK to others, the App Store (or TestFlight) is the supported route.
- **Unsigned means unverified.** Anyone can alter an unsigned IPA. Download only
  from your own Actions artifacts.
- **No App Store updates.** You update by downloading a new IPA and installing
  over the old one; the app data is preserved because the bundle identifier
  (`com.voidial.voidbook`) does not change.

---

## If the build produces nothing

The workflow runs on pushes that touch `mobile/**`. To build on demand, use
**Actions → Build sqawk (iOS, unsigned IPA) → Run workflow**, or:

```bash
gh workflow run "ios-build.yml" --repo jvoidial/voidbook --ref main
```
