# 🎀 Kitty Party Picker

A playful web app that picks a random winner from your kitty party — the fun way.

Add your members, watch their names get written on folded chits and dropped one
by one into a transparent box, then hit **Pick a winner!**. The box shakes, one
chit is pulled out, the lucky name is revealed, and the celebration begins:
confetti, a shower of money, and a bag of gold that lands with the winner's name.

## Features

- ➕ Add and remove eligible members (duplicate names are blocked)
- 📝 Folded chits fly into a transparent glass box, one after another
- 🎲 Shake animation, then a single chit is drawn out
- 🎉 Winner reveal with confetti, money rain, and a gold bag tagged with the name
- 🔄 Draw again without re-entering everyone
- 📱 Responsive layout; respects `prefers-reduced-motion`

## Run it

No build step and no dependencies — it's plain HTML/CSS/JS.

Just open `index.html` in any modern browser:

```bash
# from the project folder
xdg-open index.html    # Linux
open index.html        # macOS
```

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File         | Purpose                                   |
|--------------|-------------------------------------------|
| `index.html` | Markup and app structure                  |
| `styles.css` | Styling and all the animations            |
| `app.js`     | Roster management, chit + reveal logic     |
