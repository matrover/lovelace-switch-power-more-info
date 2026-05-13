# Switch Power More Info

Show the live power usage for `switch.*` entities directly in the Home Assistant more-info dialog.

This is a Lovelace dashboard resource for HACS. After installation it automatically adds a small power badge below the switch control when the switch has a matching power sensor.

<img width="583" height="710" alt="image" src="https://github.com/user-attachments/assets/63a34249-9765-4f7e-9d08-bc57b963d38b" />


## Features

- Works on Home Assistant switch more-info dialogs.
- Shows a compact badge with a flash icon and current watts.
- Opens the matched power sensor history when the badge is clicked.
- Supports Dutch and English labels automatically.
- Does not require dashboard card changes.

## Installation

### HACS custom repository

1. Open HACS.
2. Open the menu and choose `Custom repositories`.
3. Add this repository URL.
4. Select category `Dashboard`.
5. Install `Switch Power More Info`.
6. Refresh the browser or restart the Home Assistant app.

HACS should add this dashboard resource:

```text
/hacsfiles/lovelace-switch-power-more-info/switch-power-more-info.js
```

## Power sensor matching

The plugin looks for a power sensor related to the opened switch.

Preferred sensor names:

```text
sensor.<switch_id>_electric_consumption_w
sensor.<switch_id>_power
sensor.<switch_id>_active_power
sensor.<switch_id>_instantaneous_power
sensor.<switch_id>_power_2
```

It also accepts sensors with `device_class: power` or unit `W`/`kW`, and then tries to match by entity prefix, device code, or friendly name.

## Notes

This is a frontend-only Lovelace plugin. It does not create sensors, helpers, automations, or backend integrations.
