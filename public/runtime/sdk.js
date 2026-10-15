// src/generated/fgfdmexec-api.ts
var FGFDMExecModels = {
  ePropagate: 0,
  eInput: 1,
  eInertial: 2,
  eAtmosphere: 3,
  eWinds: 4,
  eSystems: 5,
  eMassBalance: 6,
  eAuxiliary: 7,
  ePropulsion: 8,
  eAerodynamics: 9,
  eGroundReactions: 10,
  eExternalReactions: 11,
  eBuoyantForces: 12,
  eAircraft: 13,
  eAccelerations: 14,
  eOutput: 15,
  eNumStandardModels: 16
};
var TrimMode = {
  tLongitudinal: 0,
  tFull: 1,
  tGround: 2,
  tPullup: 3,
  tCustom: 4,
  tTurn: 5,
  tNone: 6
};
var ResetToInitialConditionsMode = {
  START_NEW_OUTPUT: 1,
  DONT_EXECUTE_RUN_IC: 2
};

// src/generated/jsbsim-api.ts
var JSBSimApi = class {
  exec;
  constructor(exec) {
    this.exec = exec;
  }
  /**
   * Unbind all tied JSBSim properties.
   */
  unbind() {
    this.exec.Unbind();
  }
  /**
   * This function executes each scheduled model in succession.
   * @returns true if successful, false if sim should be ended
   */
  run() {
    return this.exec.Run();
  }
  /**
   * Initializes the sim from the initial condition object and executes each scheduled model without integrating i.e. dt=0.
   * @returns true if successful
   */
  runIc() {
    return this.exec.RunIC();
  }
  /**
   * Loads the planet. Loads the definition of the planet on which the vehicle will evolve such as its radius, gravity or its atmosphere characteristics.
   * @param PlanetPath The name of a planet definition file
   * @param useAircraftPath true if path is given relative to the aircraft path.
   * @returns true if successful
   */
  loadPlanet(PlanetPath, useAircraftPath = true) {
    return this.exec.LoadPlanet(PlanetPath, useAircraftPath);
  }
  loadModel(...args) {
    const normalizedArgs = [...args];
    switch (normalizedArgs.length) {
      case 1:
        normalizedArgs.push(true);
        break;
      case 4:
        normalizedArgs.push(true);
        break;
      default:
        break;
    }
    return this.exec.LoadModel(...normalizedArgs);
  }
  /**
   * Load a script
   * @param Script The full path name and file name for the script to be loaded.
   * @param deltaT The simulation integration step size, if given. If no value is supplied then 0.0 is used and the value is expected to be supplied in the script file itself.
   * @param initfile The initialization file that will override the initialization file specified in the script file. If no file name is given on the command line, the file specified in the script will be used. If an initialization file is not given in either place, an error will result.
   * @returns true if successfully loads; false otherwise.
   */
  loadScript(Script, deltaT = 0, initfile = "") {
    return this.exec.LoadScript(Script, deltaT, initfile);
  }
  /**
   * Set the path to the engine config file directories. Relative paths are taken from the root directory.
   * @param path path to the directory under which engine config files are kept, for instance "engine".
   */
  setEnginePath(path) {
    return this.exec.SetEnginePath(path);
  }
  /**
   * Set the path to the aircraft config file directories. Under this path, then, would be directories for various modeled aircraft such as C172/, x15/, etc. Relative paths are taken from the root directory.
   * @param path path to the aircraft directory, for instance "aircraft".
   */
  setAircraftPath(path) {
    return this.exec.SetAircraftPath(path);
  }
  /**
   * Set the path to the systems config file directories. Relative paths are taken from the root directory.
   * @param path path to the directory under which systems config files are kept, for instance "systems"
   */
  setSystemsPath(path) {
    return this.exec.SetSystemsPath(path);
  }
  /**
   * Set the directory where the output files will be written. Relative paths are taken from the root directory.
   * @param path path to the directory under which the output files will be written.
   */
  setOutputPath(path) {
    return this.exec.SetOutputPath(path);
  }
  /**
   * Returns the FGAtmosphere pointer.
   */
  getAtmosphere() {
    return this.exec.GetAtmosphere();
  }
  /**
   * Returns the FGAccelerations pointer.
   */
  getAccelerations() {
    return this.exec.GetAccelerations();
  }
  /**
   * Returns the FGWinds pointer.
   */
  getWinds() {
    return this.exec.GetWinds();
  }
  /**
   * Returns the FGFCS pointer.
   */
  getFcs() {
    return this.exec.GetFCS();
  }
  /**
   * Returns the FGPropulsion pointer.
   */
  getPropulsion() {
    return this.exec.GetPropulsion();
  }
  /**
   * Returns the FGAircraft pointer.
   */
  getMassBalance() {
    return this.exec.GetMassBalance();
  }
  /**
   * Returns the FGAerodynamics pointer
   */
  getAerodynamics() {
    return this.exec.GetAerodynamics();
  }
  /**
   * Returns the FGInertial pointer.
   */
  getInertial() {
    return this.exec.GetInertial();
  }
  /**
   * Returns the FGGroundReactions pointer.
   */
  getGroundReactions() {
    return this.exec.GetGroundReactions();
  }
  /**
   * Returns the FGExternalReactions pointer.
   */
  getExternalReactions() {
    return this.exec.GetExternalReactions();
  }
  /**
   * Returns the FGBuoyantForces pointer.
   */
  getBuoyantForces() {
    return this.exec.GetBuoyantForces();
  }
  /**
   * Returns the FGAircraft pointer.
   */
  getAircraft() {
    return this.exec.GetAircraft();
  }
  /**
   * Returns the FGPropagate pointer.
   */
  getPropagate() {
    return this.exec.GetPropagate();
  }
  /**
   * Returns the FGAuxiliary pointer.
   */
  getAuxiliary() {
    return this.exec.GetAuxiliary();
  }
  /**
   * Returns the FGInput pointer.
   */
  getInput() {
    return this.exec.GetInput();
  }
  /**
   * Returns the FGOutput pointer.
   */
  getOutput() {
    return this.exec.GetOutput();
  }
  /**
   * Retrieves the script object
   */
  getScript() {
    return this.exec.GetScript();
  }
  /**
   * Returns a pointer to the FGInitialCondition object
   */
  getIc() {
    return this.exec.GetIC();
  }
  /**
   * Returns a pointer to the FGTrim object
   */
  getTrim() {
    return this.exec.GetTrim();
  }
  /**
   * Retrieves the engine path.
   */
  getEnginePath() {
    return this.exec.GetEnginePath();
  }
  /**
   * Retrieves the aircraft path.
   */
  getAircraftPath() {
    return this.exec.GetAircraftPath();
  }
  /**
   * Retrieves the systems path.
   */
  getSystemsPath() {
    return this.exec.GetSystemsPath();
  }
  /**
   * Retrieves the full aircraft path name.
   */
  getFullAircraftPath() {
    return this.exec.GetFullAircraftPath();
  }
  /**
   * Retrieves the path to the output files.
   */
  getOutputPath() {
    return this.exec.GetOutputPath();
  }
  /**
   * Retrieves the value of a property.
   * @param property the name of the property
   */
  getPropertyValue(property) {
    return this.exec.GetPropertyValue(property);
  }
  /**
   * Sets a property value.
   * @param property the property to be set
   * @param value the value to set the property to
   */
  setPropertyValue(property, value) {
    this.exec.SetPropertyValue(property, value);
  }
  /**
   * Returns the model name.
   */
  getModelName() {
    return this.exec.GetModelName();
  }
  /**
   * Returns a pointer to the property manager object.
   */
  getPropertyManager() {
    return this.exec.GetPropertyManager();
  }
  /**
   * Returns a vector of strings representing the names of all loaded models (future)
   */
  enumerateFdms() {
    return this.exec.EnumerateFDMs();
  }
  /**
   * Gets the number of child FDMs.
   */
  getFdmCount() {
    return this.exec.GetFDMCount();
  }
  /**
   * Gets a particular child FDM.
   */
  getChildFdm(i) {
    return this.exec.GetChildFDM(i);
  }
  /**
   * Marks this instance of the Exec object as a "child" object.
   */
  setChild(ch) {
    this.exec.SetChild(ch);
  }
  /**
   * Sets the output (logging) mechanism for this run. Calling this function passes the name of an output directives file to the FGOutput object associated with this run. The call to this function should be made prior to loading an aircraft model. This call results in an FGOutput object being built as the first Output object in the FDMExec-managed list of Output objects that may be created for an aircraft model. If this call is made after an aircraft model is loaded, there is no effect. Any Output objects added by the aircraft model itself (in an < output> element) will be added after this one. Care should be taken not to refer to the same file name. An output directives file contains an < output> < /output> element, within which should be specified the parameters or parameter groups that should be logged.
   * @param fname the filename of an output directives file.
   */
  setOutputDirectives(fname) {
    return this.exec.SetOutputDirectives(fname);
  }
  /**
   * Forces the specified output object to print its items once
   */
  forceOutput(idx = 0) {
    this.exec.ForceOutput(idx);
  }
  /**
   * Sets the logging rate in Hz for all output objects (if any).
   */
  setLoggingRate(rate) {
    this.exec.SetLoggingRate(rate);
  }
  /**
   * Executes trimming in the selected mode.
   * @param mode Specifies how to trim: - tLongitudinal=0 - tFull - tGround - tPullup - tCustom - tTurn - tNone
   */
  doTrim(mode) {
    this.exec.DoTrim(mode);
  }
  /**
   * Executes linearization with state-space output You must trim first to get an accurate state-space model
   */
  doLinearization(arg0) {
    this.exec.DoLinearization(arg0);
  }
  /**
   * Disables data logging to all outputs.
   */
  disableOutput() {
    this.exec.DisableOutput();
  }
  /**
   * Enables data logging to all outputs.
   */
  enableOutput() {
    this.exec.EnableOutput();
  }
  /**
   * Pauses execution by preventing time from incrementing.
   */
  hold() {
    this.exec.Hold();
  }
  /**
   * Turn on hold after increment
   */
  enableIncrementThenHold(Timesteps) {
    this.exec.EnableIncrementThenHold(Timesteps);
  }
  /**
   * Checks if required to hold afer increment
   */
  checkIncrementalHold() {
    this.exec.CheckIncrementalHold();
  }
  /**
   * Resumes execution from a "Hold".
   */
  resume() {
    this.exec.Resume();
  }
  /**
   * Returns true if the simulation is Holding (i.e. simulation time is not moving).
   */
  holding() {
    return this.exec.Holding();
  }
  /**
   * Resets the initial conditions object and prepares the simulation to run again. If the mode's first bit is set the output instances will take special actions such as closing the current output file and open a new one with a different name. If the second bit is set then RunIC() won't be executed, leaving it to the caller to call RunIC(), e.g. in case the caller wants to set some other state like control surface deflections which would've been reset.
   * @param mode Sets the reset mode.
   */
  resetToInitialConditions(mode) {
    this.exec.ResetToInitialConditions(mode);
  }
  /**
   * Sets the debug level.
   */
  setDebugLevel(level) {
    this.exec.SetDebugLevel(level);
  }
  /**
   * Builds a catalog of properties. This function descends the property tree and creates a list (an STL vector) containing the name and node for all properties.
   * @param pcs The "root" property catalog structure pointer.
   */
  buildPropertyCatalog(pcs) {
    this.exec.BuildPropertyCatalog(pcs);
  }
  /**
   * Retrieves property or properties matching the supplied string. A string is returned that contains a carriage return delimited list of all strings in the property catalog that matches the supplied check string.
   * @param check The string to search for in the property catalog.
   * @param end_of_line End of line (CR+LF if needed for Windows).
   * @returns the carriage-return-delimited string containing all matching strings in the catalog.
   */
  queryPropertyCatalog(check, end_of_line = "\n") {
    return this.exec.QueryPropertyCatalog(check, end_of_line);
  }
  printPropertyCatalog() {
    this.exec.PrintPropertyCatalog();
  }
  printSimulationConfiguration() {
    this.exec.PrintSimulationConfiguration();
  }
  getPropertyCatalog() {
    return this.exec.GetPropertyCatalog();
  }
  setTrimStatus(status) {
    this.exec.SetTrimStatus(status);
  }
  getTrimStatus() {
    return this.exec.GetTrimStatus();
  }
  setTrimMode(mode) {
    this.exec.SetTrimMode(mode);
  }
  getTrimMode() {
    return this.exec.GetTrimMode();
  }
  getPropulsionTankReport() {
    return this.exec.GetPropulsionTankReport();
  }
  /**
   * Returns the cumulative simulation time in seconds.
   */
  getSimTime() {
    return this.exec.GetSimTime();
  }
  /**
   * Returns the simulation delta T.
   */
  getDeltaT() {
    return this.exec.GetDeltaT();
  }
  /**
   * Suspends the simulation and sets the delta T to zero.
   */
  suspendIntegration() {
    this.exec.SuspendIntegration();
  }
  /**
   * Resumes the simulation by resetting delta T to the correct value.
   */
  resumeIntegration() {
    this.exec.ResumeIntegration();
  }
  /**
   * Returns the simulation suspension state.
   * @returns true if suspended, false if executing
   */
  integrationSuspended() {
    return this.exec.IntegrationSuspended();
  }
  /**
   * Sets the current sim time.
   * @param cur_time the current time
   * @returns the current simulation time.
   */
  setSimTime(cur_time) {
    return this.exec.Setsim_time(cur_time);
  }
  /**
   * Sets the integration time step for the simulation executive.
   * @param delta_t the time step in seconds.
   */
  setDt(delta_t) {
    this.exec.Setdt(delta_t);
  }
  /**
   * Set the root directory that is used to obtain absolute paths from relative paths. Aircraft, engine, systems and output paths are not updated by this method. You must call each methods (SetAircraftPath(), SetEnginePath(), etc.) individually if you need to update these paths as well.
   * @param rootDir the path to the root directory.
   */
  setRootDir(rootDir) {
    this.exec.SetRootDir(rootDir);
  }
  /**
   * Retrieve the Root Directory.
   * @returns the path to the root (base) JSBSim directory.
   */
  getRootDir() {
    return this.exec.GetRootDir();
  }
  /**
   * Increments the simulation time if not in Holding mode. The Frame counter is also incremented.
   * @returns the new simulation time.
   */
  incrTime() {
    return this.exec.IncrTime();
  }
  /**
   * Retrieves the current frame count.
   */
  getFrame() {
    return this.exec.GetFrame();
  }
  /**
   * Retrieves the current debug level setting.
   */
  getDebugLevel() {
    return this.exec.GetDebugLevel();
  }
  /**
   * Initializes the simulation with initial conditions
   * @param FGIC The initial conditions that will be passed to the simulation.
   */
  initialize(FGIC) {
    this.exec.Initialize(FGIC);
  }
  /**
   * Sets the property forces/hold-down. This allows to do hard 'hold-down' such as for rockets on a launch pad with engines ignited.
   * @param hd enables the 'hold-down' function if non-zero
   */
  setHoldDown(hd) {
    this.exec.SetHoldDown(hd);
  }
  /**
   * Gets the value of the property forces/hold-down.
   */
  getHoldDown() {
    return this.exec.GetHoldDown();
  }
  getTemplateFunc(name) {
    return this.exec.GetTemplateFunc(name);
  }
  addTemplateFunc(name, el) {
    this.exec.AddTemplateFunc(name, el);
  }
  getRandomGenerator() {
    return this.exec.GetRandomGenerator();
  }
  sRand() {
    return this.exec.SRand();
  }
};

// src/sdk/load-module.ts
var ANSI_ESCAPE_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
function toHref(value) {
  if (value instanceof URL) {
    return value.href;
  }
  return value;
}
function stringifyLogArg(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === void 0) {
    return String(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function normalizeLogText(raw, options) {
  if (options.stripAnsi ?? true) {
    return raw.replace(ANSI_ESCAPE_PATTERN, "");
  }
  return raw;
}
function emitLog(stream, args, options = {}) {
  const raw = args.map(stringifyLogArg).join(" ");
  const message = normalizeLogText(raw, options);
  if (message === "") {
    return;
  }
  const entry = {
    stream,
    message,
    raw,
    timestamp: Date.now()
  };
  if (options.console ?? true) {
    if (stream === "stderr") {
      console.error(message);
    } else {
      console.log(message);
    }
  }
  if (stream === "stdout") {
    options.onStdout?.(entry);
  } else {
    options.onStderr?.(entry);
  }
  options.onLog?.(entry);
}
async function resolveFactory(options) {
  if (options.moduleFactory) {
    return options.moduleFactory;
  }
  const moduleUrl = options.moduleUrl ?? "/wasm/jsbsim_wasm.mjs";
  const loaded = await import(
    /* @vite-ignore */
    toHref(moduleUrl)
  );
  if (typeof loaded.default !== "function") {
    throw new Error(
      `Expected a default Emscripten module factory export from ${moduleUrl.toString()}`
    );
  }
  return loaded.default;
}
async function loadJSBSimModule(options = {}) {
  const moduleFactory = await resolveFactory(options);
  const locateFile = (path, prefix) => {
    if (options.wasmUrl && path.endsWith(".wasm")) {
      return toHref(options.wasmUrl);
    }
    if (options.locateFile) {
      return options.locateFile(path, prefix);
    }
    return `${prefix}${path}`;
  };
  return moduleFactory({
    locateFile,
    print: (...args) => {
      emitLog("stdout", args, options.log);
    },
    printErr: (...args) => {
      emitLog("stderr", args, options.log);
    }
  });
}

// src/sdk/vfs.ts
var ROOT_SEPARATOR = "/";
function normalizePath(path) {
  if (!path) {
    return ROOT_SEPARATOR;
  }
  const parts = path.split(ROOT_SEPARATOR).filter(Boolean);
  return `${ROOT_SEPARATOR}${parts.join(ROOT_SEPARATOR)}`;
}
function joinPath(...parts) {
  return normalizePath(parts.join(ROOT_SEPARATOR));
}
function ensureDir(fs, path) {
  const normalized = normalizePath(path);
  if (normalized === ROOT_SEPARATOR) {
    return;
  }
  const segments = normalized.split(ROOT_SEPARATOR).filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = `${current}${ROOT_SEPARATOR}${segment}`;
    if (!fs.analyzePath(current).exists) {
      fs.mkdir(current);
    }
  }
}
function listChildren(fs, path) {
  return fs.readdir(path).filter((entry) => entry !== "." && entry !== "..");
}
function removeTree(fs, targetPath) {
  if (!fs.analyzePath(targetPath).exists) {
    return;
  }
  const stat = fs.stat(targetPath);
  if (fs.isFile(stat.mode)) {
    fs.unlink(targetPath);
    return;
  }
  for (const child of listChildren(fs, targetPath)) {
    removeTree(fs, joinPath(targetPath, child));
  }
  fs.rmdir(targetPath);
}
function copyTree(fs, sourcePath, destinationPath) {
  const sourceStat = fs.stat(sourcePath);
  if (fs.isFile(sourceStat.mode)) {
    ensureDir(fs, destinationPath.slice(0, destinationPath.lastIndexOf(ROOT_SEPARATOR)) || ROOT_SEPARATOR);
    const data = fs.readFile(sourcePath, { encoding: "binary" });
    fs.writeFile(destinationPath, data);
    return;
  }
  ensureDir(fs, destinationPath);
  for (const child of listChildren(fs, sourcePath)) {
    copyTree(fs, joinPath(sourcePath, child), joinPath(destinationPath, child));
  }
}
function syncFs(fs, populate) {
  return new Promise((resolve, reject) => {
    fs.syncfs(populate, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
var WasmVfsManager = class {
  fs;
  runtimeRoot;
  idbMountPath;
  idbMounted = false;
  constructor(module, runtimeRoot, idbMountPath) {
    this.fs = module.FS;
    this.runtimeRoot = normalizePath(runtimeRoot);
    this.idbMountPath = normalizePath(idbMountPath);
    ensureDir(this.fs, this.runtimeRoot);
  }
  hasIdbfsSupport() {
    return typeof indexedDB !== "undefined" && Boolean(this.fs.filesystems.IDBFS);
  }
  async enablePersistence() {
    if (!this.hasIdbfsSupport()) {
      throw new Error("IDBFS is unavailable in this environment.");
    }
    if (!this.idbMounted) {
      ensureDir(this.fs, this.idbMountPath);
      this.fs.mount(this.fs.filesystems.IDBFS, {}, this.idbMountPath);
      this.idbMounted = true;
    }
    await this.syncFromPersistence();
  }
  resolveRuntimePath(path) {
    return path.startsWith(ROOT_SEPARATOR) ? normalizePath(path) : joinPath(this.runtimeRoot, path);
  }
  resolvePersistencePath(path) {
    return path.startsWith(ROOT_SEPARATOR) ? normalizePath(path) : joinPath(this.idbMountPath, path);
  }
  writeRuntimeFile(path, data) {
    const fullPath = this.resolveRuntimePath(path);
    const dir = fullPath.slice(0, fullPath.lastIndexOf(ROOT_SEPARATOR)) || ROOT_SEPARATOR;
    ensureDir(this.fs, dir);
    this.fs.writeFile(fullPath, data);
    return fullPath;
  }
  readRuntimeFile(path, encoding = "utf8") {
    return this.fs.readFile(this.resolveRuntimePath(path), { encoding });
  }
  mkdirRuntime(path) {
    const fullPath = this.resolveRuntimePath(path);
    ensureDir(this.fs, fullPath);
    return fullPath;
  }
  async syncFromPersistence() {
    if (!this.idbMounted) {
      throw new Error("IDBFS is not mounted.");
    }
    await syncFs(this.fs, true);
    for (const entry of listChildren(this.fs, this.runtimeRoot)) {
      removeTree(this.fs, joinPath(this.runtimeRoot, entry));
    }
    for (const entry of listChildren(this.fs, this.idbMountPath)) {
      copyTree(this.fs, joinPath(this.idbMountPath, entry), joinPath(this.runtimeRoot, entry));
    }
  }
  async syncToPersistence() {
    if (!this.idbMounted) {
      throw new Error("IDBFS is not mounted.");
    }
    for (const entry of listChildren(this.fs, this.idbMountPath)) {
      removeTree(this.fs, joinPath(this.idbMountPath, entry));
    }
    for (const entry of listChildren(this.fs, this.runtimeRoot)) {
      copyTree(this.fs, joinPath(this.runtimeRoot, entry), joinPath(this.idbMountPath, entry));
    }
    await syncFs(this.fs, false);
  }
};

// src/sdk/jsbsim-sdk.ts
var DEFAULT_RUNTIME_ROOT = "/runtime";
var DEFAULT_IDB_ROOT = "/persist";
var JSBSimSdk = class _JSBSimSdk extends JSBSimApi {
  module;
  vfs;
  logListeners;
  constructor(module, exec, vfs) {
    super(exec);
    this.module = module;
    this.vfs = vfs;
    this.logListeners = {
      stdout: /* @__PURE__ */ new Set(),
      stderr: /* @__PURE__ */ new Set(),
      log: /* @__PURE__ */ new Set()
    };
  }
  /**
   * Loads the JSBSim runtime module, creates `FGFDMExec`, and initializes VFS.
   */
  static async create(options = {}) {
    const originalLog = options.log;
    let bufferedLogEntries = [];
    let emitSdkLog = null;
    const forwardLogEntry = (entry) => {
      if (emitSdkLog) {
        emitSdkLog(entry);
        return;
      }
      bufferedLogEntries.push(entry);
    };
    const module = await loadJSBSimModule({
      ...options,
      log: {
        ...originalLog ?? {},
        onLog: (entry) => {
          originalLog?.onLog?.(entry);
          forwardLogEntry(entry);
        }
      }
    });
    const runtimeRoot = options.runtimeRoot ?? DEFAULT_RUNTIME_ROOT;
    const idbMountPath = options.persistence?.idbMountPath ?? DEFAULT_IDB_ROOT;
    const vfs = new WasmVfsManager(module, runtimeRoot, idbMountPath);
    if (options.persistence?.enabled) {
      await vfs.enablePersistence();
    }
    const exec = new module.FGFDMExec();
    const sdk = new _JSBSimSdk(module, exec, vfs);
    emitSdkLog = (entry) => sdk.emitLogEntry(entry);
    for (const entry of bufferedLogEntries) {
      emitSdkLog(entry);
    }
    bufferedLogEntries = [];
    sdk.configurePaths();
    return sdk;
  }
  /**
   * Registers a handler for JSBSim log output events.
   */
  on(event, listener) {
    this.logListeners[event].add(listener);
    return this;
  }
  /**
   * Removes a previously registered log handler.
   */
  off(event, listener) {
    this.logListeners[event].delete(listener);
    return this;
  }
  /**
   * Registers a one-time handler for a log output event.
   */
  once(event, listener) {
    const wrapper = (entry) => {
      this.off(event, wrapper);
      listener(entry);
    };
    return this.on(event, wrapper);
  }
  emitLogEntry(entry) {
    this.emitLogEvent(entry.stream, entry);
    this.emitLogEvent("log", entry);
  }
  emitLogEvent(event, entry) {
    for (const listener of this.logListeners[event]) {
      listener(entry);
    }
  }
  /**
   * Sets standard JSBSim runtime directories on `FGFDMExec`.
   */
  configurePaths(options = {}) {
    const rootDir = options.rootDir ?? this.vfs.runtimeRoot;
    const aircraftPath = options.aircraftPath ?? "aircraft";
    const enginePath = options.enginePath ?? "engine";
    const systemsPath = options.systemsPath ?? "systems";
    const outputPath = options.outputPath ?? "output";
    this.setRootDir(rootDir);
    this.setAircraftPath(aircraftPath);
    this.setEnginePath(enginePath);
    this.setSystemsPath(systemsPath);
    this.setOutputPath(outputPath);
  }
  /**
   * Loads an aircraft model using optional path overrides.
   */
  loadModelWithOptions(model, options = {}) {
    const addModelToPath = options.addModelToPath ?? true;
    if (options.aircraftPath || options.enginePath || options.systemsPath) {
      return this.loadModel(
        options.aircraftPath ?? "aircraft",
        options.enginePath ?? "engine",
        options.systemsPath ?? "systems",
        model,
        addModelToPath
      );
    }
    return this.loadModel(model, addModelToPath);
  }
  /**
   * Loads a script with JSBSim defaults for optional arguments.
   */
  loadScriptWithDefaults(path, deltaT = 0, initFile = "") {
    return this.loadScript(path, deltaT, initFile);
  }
  /**
   * Writes data to MEMFS (relative to runtime root) and returns resolved path.
   */
  writeDataFile(path, data) {
    return this.vfs.writeRuntimeFile(path, data);
  }
  /**
   * Reads data from MEMFS (relative to runtime root).
   */
  readDataFile(path, encoding = "utf8") {
    return this.vfs.readRuntimeFile(path, encoding);
  }
  /**
   * Creates a runtime directory and returns resolved path.
   */
  mkdir(path) {
    return this.vfs.mkdirRuntime(path);
  }
  /**
   * Synchronizes IDBFS -> MEMFS when persistence is enabled.
   */
  async syncFromPersistence() {
    await this.vfs.syncFromPersistence();
  }
  /**
   * Synchronizes MEMFS -> IDBFS when persistence is enabled.
   */
  async syncToPersistence() {
    await this.vfs.syncToPersistence();
  }
  /**
   * Mounts IDBFS and performs an initial pull.
   */
  async enablePersistence() {
    await this.vfs.enablePersistence();
  }
  /**
   * Destroys the underlying wasm-bound exec instance.
   */
  destroy() {
    this.module.destroy?.(this.exec);
    this.logListeners.stdout.clear();
    this.logListeners.stderr.clear();
    this.logListeners.log.clear();
  }
};
export {
  FGFDMExecModels,
  JSBSimApi,
  JSBSimSdk,
  ResetToInitialConditionsMode,
  TrimMode,
  loadJSBSimModule
};
//# sourceMappingURL=index.js.map