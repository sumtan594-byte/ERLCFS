# County Flight

A standalone 3D county map and flight simulator. No dashboard, live pxlayers,
authentication, tracking, database, or crash simulation.

Requires Node.js 20 or newer. No package installation or API keys are needed.

```sh
npm start
```

Open http://localhost:8766. Set `PORT` to use another port, or `HOST=0.0.0.0`
to listen beyond localhost. Deploy on a Node.js host with `npm start`.

Map geometry, imagery, trees, sky and aircraft are included locally. Pinned
JSBSim and GLTF loader files are fetched through the server on first use;
flight startup therefore needs internet access. Runtime responses are cached
in server memory and the browser. Flight simulation runs in the browser.

## Map Controls

| Input | Action |
| --- | --- |
| Left- or right-drag | Look around |
| Middle-drag | Pan across the map |
| Scroll wheel | Zoom |
| W/A/S/D or arrow keys | Move forward, left, backward, right |
| Q / E | Move down/up |
| Hold Shift | Move faster |
| One-finger drag | Pan on touchscreens |
| Two-finger pinch/twist/vertical drag | Zoom, rotate and tilt |
| Overview | Fit the county in view |
| Fly | Enter the aircraft cockpit on desktop |

## Flight Controls

Click the 3D view to focus it before using keyboard controls. Moving the mouse
without dragging steers the aircraft; dragging moves the camera independently.

| Input | Action |
| --- | --- |
| Mouse above/below centre | Pitch up/down |
| Mouse left/right of centre | Bank left/right |
| Arrow keys | Pitch and bank |
| W / S | Increase/decrease throttle |
| Q / E | Left/right rudder |
| Hold Space | Wheel brakes |
| B | Toggle parking brake |
| F | Toggle flaps |
| [ / ] | Adjust pitch trim |
| V | Switch cockpit/exterior view |
| P | Pause/resume |
| R | Centre the current camera |
| Escape | Return to the map |
| Left- or right-drag | Look around |
| Shift-drag or middle-drag | Pan the camera |
| Scroll wheel | Zoom the current view |

The cockpit and exterior cameras retain their own pan, look and zoom settings.
Cockpit panning is limited to the cabin. Drag or scroll the throttle and mixture
knobs to adjust them. Click the cockpit parking-brake and flap controls to toggle
them. On-screen controls also provide throttle, pause, restart, final approach,
flaps, parking brake and camera selection.

## Takeoff and Landing

Release the parking brake, increase throttle, and use the rudder to stay aligned
with the runway. As speed builds, gently pitch up and avoid abrupt inputs.
Reduce throttle and descend gradually for landing; flare gently just before
touchdown, then use wheel brakes to slow down. Final approach places the aircraft
on an approach path; Restart returns it to the runway.

Flight runs locally in the browser. Backgrounding the page pauses flight. The
simulator is for entertainment, not flight instruction or certified training.

## Tests

```sh
npm test
```
