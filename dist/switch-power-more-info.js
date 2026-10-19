(() => {
  const VERSION = "0.4.0";
  const BADGE_ID = "switch-power-more-info-badge";
  const INTERVAL_KEY = "__switchPowerMoreInfoInterval";
  const STATE_KEY = "__switchPowerMoreInfoEntity";
  const BADGE_BOTTOM = 4;
  const BADGE_HEIGHT = 46;
  const BADGE_GAP = 8;
  const MAX_CONTROL_SHIFT = 56;
  let lastOpenAt = 0;
  let lastTargetAt = 0;
  // Allow the more-info dialog to finish its mount/open animation before giving
  // up. On the FIRST open, HA mounts the dialog and grows it from a small height
  // to full size (measured ~93px -> ~533px). During that window findPopup()
  // rejects the undersized dialog, and nulling STATE_KEY right then would make
  // the badge never appear until a second open. So keep the entity for a short
  // grace window after the event before deciding the dialog truly closed.
  const MOUNT_GRACE_MS = 900;

  const language = (navigator.language || "en").toLowerCase();
  const label = language.startsWith("nl") ? "Stroom" : "Power";
  const SKIPPED_DOMAINS = new Set([
    "sensor",
    "binary_sensor",
    "person",
    "zone",
    "sun",
    "weather",
    "calendar",
    "camera",
    "event",
    "update",
    "button",
    "input_button",
    "automation",
    "script",
    "scene",
    "select",
    "number",
    "text",
    "date",
    "time",
    "datetime",
    "todo"
  ]);

  const entityDomain = (entityId) => String(entityId || "").split(".")[0] || "";
  const isPowerTargetEntity = (entityId) => {
    const domain = entityDomain(entityId);
    return Boolean(domain && entityId?.includes(".") && !SKIPPED_DOMAINS.has(domain));
  };

  const walk = (root, visit) => {
    if (!root) return null;
    for (const child of root.children || []) {
      const found = visit(child) || walk(child.shadowRoot, visit) || walk(child, visit);
      if (found) return found;
    }
    return null;
  };

  const getHass = () =>
    document.querySelector("home-assistant")?.hass ||
    walk(document.body, (el) => el.hass?.states ? el.hass : null);

  const rectOf = (el) => {
    const rect = el?.getBoundingClientRect?.();
    return rect && rect.width > 0 && rect.height > 0 ? rect : null;
  };

  const isMoreInfoDialog = (el) =>
    (el.localName || "").toLowerCase() === "ha-more-info-dialog";

  const hasOpenMoreInfo = () =>
    Boolean(walk(document.body, (el) => (isMoreInfoDialog(el) ? el : null)));

  const findPopup = () => {
    // Guard: only render when an actual HA more-info dialog is present. When the
    // more-info dialog closes, HA keeps other dialog-like overlays in the DOM
    // (sidebar drawer, scrim, generic ha-dialog). Matching those on mobile leaks
    // the badge into the navigation menu on iOS. If no <ha-more-info-dialog>
    // element exists, there is nothing to anchor to.
    if (!hasOpenMoreInfo()) return null;

    // Anchor to the visible dialog surface that hosts the more-info content. On
    // desktop that's the centered <dialog class="dialog open">; on mobile HA
    // renders it as <dialog class="drawer bottom open">. Prefer the dialog
    // element that is currently open, largest, and lowest on screen.
    const candidates = [];
    walk(document.body, (el) => {
      if ((el.localName || "").toLowerCase() !== "dialog") return null;
      const rect = rectOf(el);
      if (!rect || rect.width < 180 || rect.height < 120) return null;
      const cls = String(el.className || "").toLowerCase();
      const isOpen = cls.includes("open");
      candidates.push({ el, rect, isOpen, area: rect.width * rect.height, top: rect.top });
      return null;
    });

    candidates.sort(
      (a, b) =>
        Number(b.isOpen) - Number(a.isOpen) ||
        b.area - a.area
    );
    return candidates[0] || null;
  };

  const removeBadges = (keep) => {
    const remove = (badge) => {
      if (badge && badge !== keep) badge.remove();
    };

    if (!keep) restoreShiftedControls(document.body);
    document.querySelectorAll?.(`#${BADGE_ID}`).forEach(remove);
    walk(document.body, (el) => {
      if (el.id === BADGE_ID) remove(el);
      el.shadowRoot?.querySelectorAll?.(`#${BADGE_ID}`).forEach(remove);
      return null;
    });
  };

  const restoreShiftedControls = (scope) => {
    walk(scope?.shadowRoot || scope, (el) => {
      if (el.dataset?.powerMoreInfoTransform !== undefined) {
        el.style.transform = el.dataset.powerMoreInfoTransform;
        el.style.marginBottom = el.dataset.powerMoreInfoMarginBottom;
        el.style.willChange = el.dataset.powerMoreInfoWillChange;
        delete el.dataset.powerMoreInfoTransform;
        delete el.dataset.powerMoreInfoMarginBottom;
        delete el.dataset.powerMoreInfoWillChange;
        delete el.dataset.powerMoreInfoShift;
      }
      return null;
    });
  };

  const reserveBadgeSpace = (popupEl, badgeEl) => {
    const popupRect = rectOf(popupEl);
    if (!popupRect) return;

    restoreShiftedControls(document.body);
    const popupCenterX = popupRect.left + popupRect.width / 2;
    const badgeRect = rectOf(badgeEl);
    const reservedTop = (badgeRect ? badgeRect.top : popupRect.bottom - BADGE_BOTTOM - BADGE_HEIGHT) - BADGE_GAP;
    const controls = [];

    walk(document.body, (el) => {
      const name = (el.localName || "").toLowerCase();
      const isControl =
        name.includes("ha-control") ||
        name.includes("more-info-control") ||
        name.includes("state-control");
      const isStateControl = name.includes("state-control");
      const isLeafControl =
        name.includes("ha-control-switch") ||
        name === "ha-switch" ||
        name.includes("ha-control-slider") ||
        name.includes("ha-control-circular-slider");
      const rect = rectOf(el);
      const insidePopup =
        rect &&
        rect.left >= popupRect.left - 8 &&
        rect.right <= popupRect.right + 8 &&
        rect.top >= popupRect.top - 8 &&
        rect.bottom <= popupRect.bottom + 24;
      const centerX = (rect?.left || 0) + (rect?.width || 0) / 2;
      const centeredVerticalControl =
        insidePopup &&
        rect.width >= 70 &&
        rect.width <= Math.min(260, popupRect.width * 0.55) &&
        rect.height >= 120 &&
        rect.height <= popupRect.height * 0.9 &&
        Math.abs(centerX - popupCenterX) <= Math.max(90, popupRect.width * 0.25);

      if (el.id !== BADGE_ID && insidePopup && (isControl || centeredVerticalControl) && rect.bottom > reservedTop) {
        controls.push({
          el,
          rect,
          area: rect.width * rect.height,
          score: isStateControl ? 4 : isLeafControl ? 3 : isControl ? 2 : 1
        });
      }
      return null;
    });

    controls.sort((a, b) => b.score - a.score || b.rect.bottom - a.rect.bottom || b.area - a.area);
    const target = controls[0];
    if (!target) return;

    const reserve = Math.min(MAX_CONTROL_SHIFT, Math.ceil(target.rect.bottom - reservedTop));
    if (reserve < 6) return;

    target.el.dataset.powerMoreInfoTransform = target.el.style.transform || "";
    target.el.dataset.powerMoreInfoMarginBottom = target.el.style.marginBottom || "";
    target.el.dataset.powerMoreInfoWillChange = target.el.style.willChange || "";
    target.el.dataset.powerMoreInfoShift = String(reserve);
    target.el.style.marginBottom = `${reserve}px`;

    const adjustedBadgeRect = rectOf(badgeEl);
    const adjustedRect = rectOf(target.el);
    const adjustedReservedTop = (adjustedBadgeRect ? adjustedBadgeRect.top : reservedTop + reserve) - BADGE_GAP;
    const residualShift = adjustedRect ? Math.min(MAX_CONTROL_SHIFT, Math.ceil(adjustedRect.bottom - adjustedReservedTop)) : 0;
    if (residualShift >= 6) {
      target.el.style.transform = `${target.el.dataset.powerMoreInfoTransform} translateY(-${residualShift}px)`.trim();
      target.el.style.willChange = "transform";
    }
  };

  const isPowerSensor = (state) => {
    const attributes = state?.attributes || {};
    const id = state?.entity_id || "";
    const unit = String(attributes.unit_of_measurement || "").toLowerCase();
    const deviceClass = String(attributes.device_class || "").toLowerCase();

    if (
      id.includes("power_factor") ||
      id.includes("power_source") ||
      id.includes("apparent_power") ||
      id.includes("reactive_power")
    ) {
      return false;
    }

    return deviceClass === "power" || unit === "w" || unit === "kw";
  };

  const wordsOf = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g) || [];

  const isUsefulCode = (value) => {
    const code = String(value || "").toLowerCase();
    return code.length >= 3 && (/\d/.test(code) || /^nc[a-z0-9]+$/.test(code));
  };

  const hasWord = (value, word) => wordsOf(value).includes(String(word || "").toLowerCase());

  const startsWithWords = (value, prefixWords) => {
    const words = wordsOf(value);
    return prefixWords.length > 0 && prefixWords.every((word, index) => words[index] === word);
  };

  // A switched entity can be one output of a multi-channel device, e.g.
  // switch.<plug>_l1 with sensors sensor.<plug>_power_l1 and _power_l2. Split the
  // trailing channel token (l1, ch2, out1, ...) off the entity base so the right
  // measurement can be matched.
  const CHANNEL_TOKEN = /^(?:l|ch|out|relay|gang|sw|s)(\d+)$/;

  const channelTokenOf = (value) => {
    const token = String(value || "").split("_").pop().toLowerCase();
    return CHANNEL_TOKEN.test(token) ? token : null;
  };

  const splitChannel = (base) => {
    const token = channelTokenOf(base);
    if (!token) return { root: base, channel: null };
    return { root: String(base).slice(0, -(token.length + 1)), channel: token };
  };

  // Frontend registry access (hass.entities). Cached per registry object because
  // render() runs on a 250ms interval.
  let registryRef = null;
  const deviceSensorCache = new Map();

  const registryEntry = (hass, entityId) => {
    const registry = hass.entities || {};
    if (registry[entityId]) return registry[entityId];
    const needle = String(entityId || "").toLowerCase();
    const key = Object.keys(registry).find((candidate) => candidate.toLowerCase() === needle);
    return key ? registry[key] : null;
  };

  const deviceSensorIds = (hass, entityId) => {
    const registry = hass.entities;
    if (!registry) return [];
    if (registry !== registryRef) {
      registryRef = registry;
      deviceSensorCache.clear();
    }
    if (deviceSensorCache.has(entityId)) return deviceSensorCache.get(entityId);

    const deviceId = registryEntry(hass, entityId)?.device_id;
    // Frontend registry entries normally carry entity_id; the map key is used as a
    // fallback so the lookup works either way.
    const ids = deviceId
      ? Object.entries(registry)
          .filter(
            ([id, entry]) =>
              entry?.device_id === deviceId &&
              !entry.disabled_by &&
              String(entry.entity_id || id).startsWith("sensor.")
          )
          .map(([id, entry]) => entry.entity_id || id)
      : [];

    deviceSensorCache.set(entityId, ids);
    return ids;
  };

  const powerStatesOf = (hass, ids) =>
    ids.map((id) => hass.states[id]).filter((state) => isPowerSensor(state));

  const stripChannelToken = (entityId) => {
    const token = channelTokenOf(entityId);
    return token ? entityId.slice(0, -(token.length + 1)) : entityId;
  };

  // Words that say nothing about which device is meant (every power sensor has
  // them), so they must never be the reason to accept a sensor. A word carrying
  // digits is a device code (sh06, k01, nc9) and weighs extra.
  const GENERIC_WORDS = new Set([
    "sensor",
    "power",
    "energy",
    "energie",
    "verbruik",
    "consumption",
    "electric",
    "electrical",
    "plug",
    "stekker",
    "socket",
    "meter",
    "device",
    "apparaat",
    "watt",
    "w",
    "kw",
    "kwh"
  ]);

  const isCodeWord = (word) => word.length >= 3 && /\d/.test(word);

  const overlapScore = (left, right) => {
    const words = new Set(wordsOf(left).filter((word) => !GENERIC_WORDS.has(word)));
    return wordsOf(right)
      .filter((word) => words.has(word))
      .reduce((score, word) => score + (isCodeWord(word) ? 3 : 1), 0);
  };

  // Sensors that differ only by their channel token (…_power_l1 / …_power_l2)
  // belong to the same multi-channel measurement. Only a group that shares
  // meaningful words with the opened entity qualifies, so a device carrying
  // several channel pairs (and inverters with dozens of unrelated power sensors)
  // never gets mixed up. Ties are broken deterministically.
  const bestChannelGroup = (states, owner) => {
    const groups = new Map();
    for (const state of states) {
      const key = stripChannelToken(state.entity_id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(state);
    }

    const candidates = [...groups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({ key, group, score: overlapScore(key, owner) }))
      .filter((candidate) => candidate.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || b.group.length - a.group.length || a.key.localeCompare(b.key)
      );

    return candidates.length ? candidates[0].group : null;
  };

  // Configuration / diagnostic entities (child lock, time period, network
  // indicator, ...) belong to a device with a power sensor, but they are not the
  // thing that consumes power. Never put a badge on those.
  const isConfigEntity = (hass, entityId) => {
    const category = registryEntry(hass, entityId)?.entity_category;
    return category === "config" || category === "diagnostic";
  };

  const pickPowerSensors = (hass, entityState) => {
    const base = entityState.entity_id.replace(/^[^.]+\./, "");
    const { root, channel } = splitChannel(base);

    const names = [
      `${base}_electric_consumption_w`,
      `${base}_power`,
      `${base}_active_power`,
      `${base}_instantaneous_power`,
      `${base}_power_2`
    ];
    if (channel) {
      names.unshift(
        `${root}_power_${channel}`,
        `${root}_${channel}_power`,
        `${root}_${channel}_electric_consumption_w`
      );
    }

    for (const name of names) {
      if (isPowerSensor(hass.states[`sensor.${name}`])) return [hass.states[`sensor.${name}`]];
    }

    // Same device: a multi-channel device exposes one measurement per output
    // (…_power_l1 / …_power_l2). Resolving through the device registry also
    // matches a renamed entity (a plug serving two rooms, one gang renamed to
    // another area). A channel entity only accepts a sensor whose stripped id
    // shares words with the entity, so a foreign channel sensor on the same
    // device is never shown as this entity's power.
    const deviceStates = powerStatesOf(hass, deviceSensorIds(hass, entityState.entity_id));
    if (channel) {
      const own = deviceStates
        .filter((state) => channelTokenOf(state.entity_id) === channel)
        .map((state) => ({ state, score: overlapScore(stripChannelToken(state.entity_id), base) }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score || a.state.entity_id.localeCompare(b.state.entity_id));
      if (own.length) return [own[0].state];
    } else {
      const grouped = bestChannelGroup(deviceStates, base);
      if (grouped) return grouped;
    }

    const sensors = Object.values(hass.states).filter((state) =>
      state.entity_id.startsWith("sensor.") && isPowerSensor(state)
    );

    const prefixed = sensors.filter((state) => state.entity_id.startsWith(`sensor.${base}_`));
    if (!channel && prefixed.length > 1) {
      const grouped = bestChannelGroup(prefixed, base);
      if (grouped) return grouped;
    }
    if (prefixed.length) return [prefixed[0]];

    const code = base.split("_").slice(-1)[0]?.toLowerCase();
    const entityNameWords = wordsOf(entityState.attributes?.friendly_name);
    const canMatchName = entityNameWords.length >= 3 || entityNameWords.some(isUsefulCode);

    const named = sensors.find((state) => {
      const name = String(state.attributes?.friendly_name || "").toLowerCase();
      return (isUsefulCode(code) && hasWord(name, code)) || (canMatchName && startsWithWords(name, entityNameWords));
    });
    return named ? [named] : [];
  };

  const powerWatts = (state) => {
    const value = Number(state?.state);
    if (!Number.isFinite(value)) return null;
    return String(state.attributes?.unit_of_measurement || "W").toLowerCase() === "kw"
      ? value * 1000
      : value;
  };

  const formatWatts = (watts) =>
    `${Math.abs(watts) >= 100 ? Math.round(watts) : watts.toFixed(1).replace(".0", "")} W`;

  const formatPower = (states) => {
    const values = (states || []).map(powerWatts).filter((value) => value !== null);
    if (!values.length) return null;
    return formatWatts(values.reduce((total, value) => total + value, 0));
  };

  const dispatchMoreInfo = (target, entityId) => {
    target?.dispatchEvent?.(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId, entity_id: entityId }
    }));
  };

  const openMoreInfo = (entityId, source) => {
    const now = Date.now();
    if (now - lastOpenAt < 650) return;
    lastOpenAt = now;

    window[STATE_KEY] = null;
    const homeAssistant = document.querySelector("home-assistant");
    const popup = findPopup()?.el;

    dispatchMoreInfo(source, entityId);
    dispatchMoreInfo(popup, entityId);
    dispatchMoreInfo(document, entityId);
    dispatchMoreInfo(homeAssistant, entityId);
    dispatchMoreInfo(window, entityId);
    window.setTimeout(() => removeBadges(null), 150);
  };

  const activateBadge = (badge, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (badge.dataset.powerEntity) openMoreInfo(badge.dataset.powerEntity, badge);
  };

  const getBadge = (host) => {
    const root = host?.shadowRoot || host;
    let badge = root?.querySelector?.(`#${BADGE_ID}`);

    if (!badge) {
      badge = document.createElement("button");
      badge.id = BADGE_ID;
      badge.type = "button";
      badge.innerHTML = `
        <ha-icon icon="mdi:flash" style="--mdc-icon-size:22px;color:#18e000;flex:0 0 auto;"></ha-icon>
        <div>
          <div class="label" style="color:var(--secondary-text-color,#b8b8b8);font-size:12px;font-weight:600;line-height:1.05;text-align:left;"></div>
          <div class="value" style="color:var(--primary-text-color,#f2f2f2);font-size:14px;font-weight:700;line-height:1.1;white-space:nowrap;text-align:left;"></div>
        </div>
      `;
      badge.addEventListener("touchstart", (event) => activateBadge(badge, event), { passive: false });
      badge.addEventListener("touchend", (event) => activateBadge(badge, event), { passive: false });
      badge.addEventListener("pointerup", (event) => activateBadge(badge, event));
      badge.addEventListener("click", (event) => activateBadge(badge, event));
      root?.appendChild?.(badge);
    }

    removeBadges(badge);
    return badge;
  };

  const preparePopup = (popupEl) => {
    if (!popupEl) return;

    const computed = getComputedStyle(popupEl);
    if (computed.position === "static") popupEl.style.position = "relative";
    popupEl.style.minHeight = "min(660px, calc(100vh - 8px))";
    popupEl.style.maxHeight = "calc(100vh - 8px)";
    popupEl.style.overflow = "hidden";
  };

  const styleBadge = (badge, popupEl) => {
    preparePopup(popupEl);

    Object.assign(badge.style, {
      alignItems: "center",
      background: "rgba(255,255,255,.11)",
      border: "0",
      borderRadius: "10px",
      bottom: `${BADGE_BOTTOM}px`,
      boxSizing: "border-box",
      color: "var(--primary-text-color,#f2f2f2)",
      cursor: "pointer",
      display: "flex",
      gap: "8px",
      left: "50%",
      margin: "0",
      maxWidth: "calc(100% - 28px)",
      minHeight: "46px",
      minWidth: "0",
      opacity: "1",
      padding: "7px 14px",
      pointerEvents: "auto",
      position: "absolute",
      right: "auto",
      top: "auto",
      touchAction: "manipulation",
      transform: "translateX(-50%)",
      WebkitTapHighlightColor: "transparent",
      width: "auto",
      visibility: "visible",
      zIndex: "10"
    });

    badge.dataset.version = VERSION;
    reserveBadgeSpace(popupEl, badge);
  };

  const render = () => {
    const hass = getHass();
    const popup = findPopup();
    // If there's no actual more-info dialog open, forget the last entity and
    // remove any badge. This prevents the badge from leaking into the drawer /
    // sidebar on mobile when the more-info dialog closes but an interval tick
    // still runs. Exception: if a more-info event for a power target just fired
    // (within the mount grace window), the dialog may still be animating in on
    // its FIRST open — don't clobber STATE_KEY yet, wait for it to finish.
    if (!hass || !popup) {
      if (window[STATE_KEY] && Date.now() - lastTargetAt < MOUNT_GRACE_MS) {
        return removeBadges(null);
      }
      window[STATE_KEY] = null;
      return removeBadges(null);
    }

    const entityId = window[STATE_KEY];
    if (!isPowerTargetEntity(entityId)) return removeBadges(null);

    window[STATE_KEY] = entityId;

    // Child lock / time period / indicator switches live on the same device as a
    // power sensor but consume nothing themselves.
    if (isConfigEntity(hass, entityId)) return removeBadges(null);

    const entityState = hass.states[entityId];
    const powerSensors = entityState ? pickPowerSensors(hass, entityState) : [];
    const text = formatPower(powerSensors);
    if (!text) return removeBadges(null);

    // Show which output the value belongs to when the entity is one channel of a
    // multi-channel device (e.g. "Stroom L1"), or every channel when the total is
    // summed ("Stroom L1+L2"). Only channels that actually reported a value count,
    // so "Stroom L1" is not claimed next to a sum that omits L1.
    const channels = powerSensors
      .filter((state) => powerWatts(state) !== null)
      .map((state) => channelTokenOf(state.entity_id))
      .filter(Boolean);
    const badge = getBadge(popup.el);
    styleBadge(badge, popup.el);
    badge.querySelector(".label").textContent = `${label}${
      channels.length ? ` ${channels.map((channel) => channel.toUpperCase()).join("+")}` : ""
    }`;
    badge.querySelector(".value").textContent = text;
    badge.dataset.powerEntity = powerSensors.find((state) => powerWatts(state) !== null).entity_id;
    badge.title = powerSensors
      .filter((state) => powerWatts(state) !== null)
      .map((state) => state.entity_id)
      .join("\n");
    badge.hidden = false;
  };

  window.addEventListener("hass-more-info", (event) => {
    const id = event.detail?.entityId || event.detail?.entity_id || null;
    if (isPowerTargetEntity(id)) {
      window[STATE_KEY] = id;
      lastTargetAt = Date.now();
    } else if (id) {
      window[STATE_KEY] = null;
      removeBadges(null);
    }

    window.setTimeout(render, 0);
    window.setTimeout(render, 100);
    window.setTimeout(render, 500);
  });

  window.addEventListener("location-changed", () => {
    window.setTimeout(render, 0);
    window.setTimeout(() => {
      if (!findPopup()) {
        window[STATE_KEY] = null;
        removeBadges(null);
      }
    }, 300);
  });

  window.clearInterval(window[INTERVAL_KEY]);
  window[INTERVAL_KEY] = window.setInterval(render, 250);
  render();

  console.info(`Power More Info ${VERSION} loaded`);
})();
