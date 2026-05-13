# Publishing

Use the contents of this folder as the root of a new public GitHub repository.

Recommended repository name:

```text
lovelace-switch-power-more-info
```

Recommended GitHub description:

```text
Show live power usage in Home Assistant switch more-info dialogs.
```

Recommended GitHub topics:

```text
home-assistant
hacs
lovelace
dashboard
switch
power-monitoring
```

Release flow:

1. Push this folder as the repository root.
2. Check that the GitHub Action passes.
3. Create a GitHub release named `v0.1.0`.
4. Add the repository to HACS as a custom repository with category `Dashboard`.

For inclusion in the default HACS store, replace `docs/preview.svg` with a real screenshot from Home Assistant.
