# Tap Dash Hero

A fast-paced mobile action game where players control a hero who dashes across the screen to defeat enemies, collect power-ups, and achieve high scores.

## Overview

Tap Dash Hero features intuitive tap and swipe controls, creating an accessible yet challenging gameplay experience with short, intense play sessions.

### Core Gameplay

- **Tap to Dash**: Player taps the screen to make the hero dash in that direction
- **Hold to Charge**: Longer presses result in longer dashes
- **Swipe Actions**: Special attacks or evasive maneuvers
- **Energy Management**: Limited dash energy that recharges over time
- **Combo System**: Chain enemy defeats for multipliers and higher scores

## Development Setup

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for local development without Docker)

### Using Docker

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd tap-dash-hero-public
   ```

2. Start the development environment:

   ```bash
   docker compose up
   ```

3. Access the game at http://localhost:8080

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### ⚠️ Audio Files Exception

**Audio files are NOT included under the Apache 2.0 license.** All audio files in the `src/assets/audio/` directory are provided for demonstration purposes only and may not be redistributed, modified, or used for commercial purposes without permission from the original copyright holders.

If you fork or use this project, you **MUST replace the audio files** with your own or properly licensed alternatives.

Audio files included (not covered by Apache 2.0):
- `bgm.mp3`
- `dash.mp3`
- `explosion.mp3`
- `powerup.mp3`

### ⚠️ Image Files Exception

**Image files are NOT included under the Apache 2.0 license.** All image files in the `src/assets/images/` directory are excluded from the Apache 2.0 license. Some of these images may have been obtained from free image sites or other sources with different licensing terms.

If you fork or use this project, you **MUST replace the image files** with your own or properly licensed alternatives.

### Third-Party Software

This project uses the following open source libraries:

- **Phaser** (v3.88.2) - MIT License
- **Howler.js** (v2.2.3) - MIT License
- **localForage** (v1.10.0) - Apache 2.0 License
- **stats.js** (v0.17.0) - MIT License

See [NOTICE](NOTICE) file for detailed attribution and license information.
