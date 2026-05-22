# Power More Info

<p align="center">
  <img src="https://raw.githubusercontent.com/matrover/lovelace-switch-power-more-info/main/docs/icon.png" alt="Power More Info icon" width="96" height="96">
</p>

<p align="center">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=matrover&repository=lovelace-switch-power-more-info&category=plugin">
    <img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open this repository in HACS">
  </a>
  <a href="https://my.home-assistant.io/redirect/lovelace_resources/">
    <img src="https://my.home-assistant.io/badges/lovelace_resources.svg" alt="Open dashboard resources in Home Assistant">
  </a>
</p>

Show live power usage in Home Assistant more-info dialogs.
Power More Info is a frontend-only Lovelace dashboard resource for HACS.
It adds a compact, clickable wattage badge below supported controls when the
opened entity has a matching power sensor.

It is built for smart plugs, switch entities, lights, fans, appliance plugs,
Zigbee/Z-Wave plugs, Tuya plugs, Shelly devices, energy monitoring sensors,
and Home Assistant dashboards where you want instant watt values without
editing every card.

<img width="583" height="710" alt="Power More Info screenshot in a Home Assistant more-info dialog" src="https://github.com/user-attachments/assets/63a34249-9765-4f7e-9d08-bc57b963d38b" />

## Search keywords

- Home Assistant power badge
- HACS power monitoring
- Lovelace power usage
- more-info wattage
- smart plug watts
- switch power consumption
- light power monitoring
- fan power monitoring
- Home Assistant energy monitor
- dashboard resource
- frontend plugin
- custom Lovelace plugin
- HACS dashboard plugin

## Features

- Adds a live `W` badge to Home Assistant more-info dialogs.
- Works with switches, lights, fans, and other controllable entities that have a related power sensor.
- Keeps sensors, helpers, scripts, scenes, buttons, diagnostic entities, and unrelated entities out of scope.
- Shows a compact card-style badge with a green flash icon and current watts.
- Opens the matched power sensor history graph when the badge is clicked.
- Preserves the original more-info control spacing and avoids slider overlap.
- Supports Dutch and English labels automatically.
- Requires no dashboard YAML changes and no per-card configuration.

## Installation

### HACS

Add this repository to HACS with My Home Assistant:

<p>
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=matrover&repository=lovelace-switch-power-more-info&category=plugin">
    <img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Add Power More Info to HACS">
  </a>
</p>

Or install manually:

1. Open HACS in Home Assistant.
2. Open the menu and choose `Custom repositories`.
3. Add this repository URL:

   ```text
   https://github.com/matrover/lovelace-switch-power-more-info
   ```

4. Select category `Dashboard`.
5. Install `Power More Info`.
6. Refresh the browser, clear frontend cache, or restart the Home Assistant companion app.

HACS should register this dashboard resource:

```text
/hacsfiles/lovelace-switch-power-more-info/switch-power-more-info.js
```

### Manual resource check

If the badge does not appear after installation, open Dashboard resources with the button above and verify that the resource exists as a JavaScript module.

## How It Works

When you open a Home Assistant more-info dialog, the plugin checks the opened entity and tries to find a matching power sensor. If it finds one, it renders a small badge at the bottom of the dialog with the current power usage.

Clicking the badge opens the matched power sensor's more-info dialog, so you can immediately view the history graph.

## Power Sensor Matching

Preferred exact sensor IDs:

```text
sensor.<entity_id_without_domain>_electric_consumption_w
sensor.<entity_id_without_domain>_power
sensor.<entity_id_without_domain>_active_power
sensor.<entity_id_without_domain>_instantaneous_power
sensor.<entity_id_without_domain>_power_2
```

The plugin also accepts sensors with:

- `device_class: power`
- unit `W`
- unit `kW`

Fallback matching is intentionally strict. It can match by entity prefix, useful device codes such as `NC24`, or a meaningful friendly-name prefix. It avoids broad substring matches, so names like `room` no longer accidentally match unrelated sensors like `stroomverbruik`.

## Supported Use Cases

- Smart plug more-info dialogs with live wattage.
- Zigbee, Z-Wave, Shelly, Tuya, ESPHome, and MQTT power plugs.
- Lights or fans with separate power sensors.
- Appliance monitoring for washing machines, dryers, ovens, fridges, pumps, chargers, and media equipment.
- Home Assistant dashboards where existing cards already open more-info dialogs.

## Limitations

- This is a frontend-only plugin. It does not create sensors, helpers, automations, or integrations.
- The badge only appears when a matching power sensor already exists.
- HACS and Home Assistant may require a browser refresh before updated frontend resources are loaded.

## Troubleshooting

- No badge visible: check that a matching sensor exists and has `device_class: power`, `W`, or `kW`.
- Wrong sensor matched: rename the sensor or entity so they share a useful device code or exact prefix.
- Old layout still visible: clear the frontend cache or restart the Home Assistant app.
- Badge visible but not clickable: update to the latest release and hard refresh the browser.

## HACS Metadata

Power More Info is a HACS dashboard plugin / Lovelace frontend resource
for Home Assistant.

Useful discovery terms include: `home-assistant`, `hacs`, `hacs-dashboard`,
`hacs-plugin`, `lovelace`, `frontend`, `power-monitoring`,
`energy-monitoring`, `smart-plug`, `wattage`, `more-info`, `power-sensor`.

The project icon is included in the rendered README and HACS detail view. HACS dashboard repositories use the standard dashboard icon in the repository list.
