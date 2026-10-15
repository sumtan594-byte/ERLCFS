# Cessna 172

Model: Cessna172 by KOG_THORNS, supplied by the user.
Source: https://sketchfab.com/3d-models/cessna172-d1b15841c29c43d0862667300bad55a4
License: https://creativecommons.org/licenses/by/4.0/
Runtime adjustments: scale/alignment, animated yokes, propeller and landing gear.

Flight dynamics: JSBSim 1.2.4 (LGPL-2.1), through @0x62/jsbsim-wasm 1.2.4-beta.4 (MIT wrapper).
Source and license: https://github.com/JSBSim-Team/jsbsim/tree/v1.2.4
Wrapper source and compatibility patches: https://github.com/0x62/jsbsim-wasm
Local runtime adjustment: the synchronous Embind invocation adapter uses ordinary closures rather than generated JavaScript, retaining the site's no-eval security policy. See lib/flight-wasm-bindings.js.
The upstream C172P data is an educational/entertainment model, not manufacturer-endorsed or certified flight-training data. No validation or aircraft certification is claimed.

GLB loading: Three.js 0.182.0 official GLTFLoader (MIT).
Source: https://github.com/mrdoob/three.js/tree/r182
