(() => {
  const VERSION = "0.2.9";
  const BADGE_ID = "switch-power-more-info-badge";
  const INTERVAL_KEY = "__switchPowerMoreInfoInterval";
  const STATE_KEY = "__switchPowerMoreInfoEntity";
  const BADGE_BOTTOM = 4;
  const BADGE_HEIGHT = 46;
  const BADGE_GAP = 8;
  const MAX_CONTROL_SHIFT = 56;
  let lastOpenAt = 0;

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

  const findPopup = () => {
    const candidates = [];
    walk(document.body, (el) => {
      const rect = rectOf(el);
      if (!rect || rect.width < 180 || rect.height < 120) return null;

      const name = (el.localName || "").toLowerCase();
      const cls = String(el.className || "").toLowerCase();
      const role = (el.getAttribute?.("role") || "").toLowerCase();
      const isSurface = cls.includes("dialog__surface") || cls.includes("mdc-dialog__surface") || role === "dialog";
      const isMoreInfo = name.includes("more-info");
      const isDialog = name.includes("ha-dialog") || name.includes("mwc-dialog") || name.includes("dialog");

      if (isSurface || isDialog) {
        candidates.push({
          el,
          rect,
          score: (isSurface ? 3 : 0) + (isDialog ? 2 : 0) + (isMoreInfo ? 1 : 0),
          area: rect.width * rect.height
        });
      }
      return null;
    });

    candidates.sort((a, b) => b.score - a.score || b.area - a.area);
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

  const pickPowerSensor = (hass, entityState) => {
    const base = entityState.entity_id.replace(/^[^.]+\./, "");
    const preferred = [
      `sensor.${base}_electric_consumption_w`,
      `sensor.${base}_power`,
      `sensor.${base}_active_power`,
      `sensor.${base}_instantaneous_power`,
      `sensor.${base}_power_2`
    ];

    for (const id of preferred) {
      if (isPowerSensor(hass.states[id])) return hass.states[id];
    }

    const sensors = Object.values(hass.states).filter((state) =>
      state.entity_id.startsWith("sensor.") && isPowerSensor(state)
    );

    const prefixed = sensors.find((state) => state.entity_id.startsWith(`sensor.${base}_`));
    if (prefixed) return prefixed;

    const code = base.split("_").slice(-1)[0]?.toLowerCase();
    const entityName = String(entityState.attributes?.friendly_name || "").toLowerCase();

    return sensors.find((state) => {
      const name = String(state.attributes?.friendly_name || "").toLowerCase();
      return (code && name.includes(code)) || (entityName && name.startsWith(entityName));
    }) || null;
  };

  const formatPower = (state) => {
    const value = Number(state?.state);
    if (!Number.isFinite(value)) return null;

    const watts = String(state.attributes?.unit_of_measurement || "W").toLowerCase() === "kw"
      ? value * 1000
      : value;

    return `${Math.abs(watts) >= 100 ? Math.round(watts) : watts.toFixed(1).replace(".0", "")} W`;
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
    if (!hass || !popup) return removeBadges(null);

    const entityId = window[STATE_KEY];
    if (!isPowerTargetEntity(entityId)) return removeBadges(null);

    window[STATE_KEY] = entityId;
    const entityState = hass.states[entityId];
    const powerSensor = entityState ? pickPowerSensor(hass, entityState) : null;
    const text = powerSensor ? formatPower(powerSensor) : null;
    if (!text) return removeBadges(null);

    const badge = getBadge(popup.el);
    styleBadge(badge, popup.el);
    badge.querySelector(".label").textContent = label;
    badge.querySelector(".value").textContent = text;
    badge.dataset.powerEntity = powerSensor.entity_id;
    badge.title = `Open ${powerSensor.entity_id}`;
    badge.hidden = false;
  };

  window.addEventListener("hass-more-info", (event) => {
    const id = event.detail?.entityId || event.detail?.entity_id || null;
    if (isPowerTargetEntity(id)) {
      window[STATE_KEY] = id;
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
