# Aurora Face

Aurora Face is an interactive 3D web application that visualizes a glowing, emotive face using Three.js and custom shaders. It features real-time expression changes, dynamic aura colors, and adjustable animation settings, all rendered in a beautiful "Aurora Sphere" style.

## Features

- **Dynamic Expressions**: Seamlessly switch between emotions including Neutral, Happy, Surprised, Angry, Suspicious, Sad, and Cry.
- **Customizable Aura**: Change the visual theme with preset color palettes like Aurora, Fire, Ocean, Nature, and Mystic.
- **Interactive Controls**:
  - **Emotion**: Select the character's facial expression.
  - **Aura**: Choose the glowing color scheme.
  - **Intensity**: Adjust the strength of the expression.
  - **Speed**: Control the speed of the animation.
- **Real-time Interaction**: The character responds to mouse movements, creating a sense of presence.
- **Advanced Rendering**: Utilizes custom shaders for the sphere effect and post-processing (Bloom) for a glowing aesthetic.
- **Responsive Design**: Automatically adjusts to different screen sizes.

## Tech Stack

- **Three.js**: For 3D rendering and scene management.
- **HTML5 & CSS3**: For the user interface and layout.
- **JavaScript (ES Modules)**: Core application logic.
- **Vite**: Build tool and bundler.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- Python (optional, for the default dev server script).

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd face
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the Application

To start the development server:

```bash
npm run dev
```

> **Note:** The default `dev` script currently uses Python's `http.server` on port 8000. If you prefer using Vite's development server with hot module replacement, you can run `npx vite` instead.

Open your browser and navigate to `http://localhost:8000` (or the URL provided in the terminal) to view the application.

## Usage Guide

1. **Emotion Selector**: Use the dropdown menu to select an emotion. The face will smoothly transition to the new state.
2. **Aura Selector**: Pick a color theme to change the character's glow.
3. **Sliders**:
   - Use the **Intensity** slider to make expressions more or less pronounced.
   - Use the **Speed** slider to control how fast the character breathes and animates.
4. **Randomize**: Click the "Randomize" button to generate a random combination of emotion, color, and settings.

## License

This project is licensed under the MIT License.
