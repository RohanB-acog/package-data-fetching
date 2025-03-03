"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BaseFetcher: () => BaseFetcher,
  FetcherRegistry: () => FetcherRegistry,
  ListRenderer: () => ListRenderer,
  Toggle: () => Toggle,
  withClientFetching: () => withClientFetching,
  withServerFetching: () => withServerFetching
});
module.exports = __toCommonJS(src_exports);

// src/core/FetcherRegistry.ts
var FetcherRegistry = class {
  constructor() {
    this.apiBasePath = "/api/data";
    this.baseUrl = typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL ? process.env.NEXT_PUBLIC_API_BASE_URL : typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    this.fetchers = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!FetcherRegistry.instance) {
      FetcherRegistry.instance = new FetcherRegistry();
    }
    return FetcherRegistry.instance;
  }
  register(componentId, fetcher) {
    this.fetchers.set(componentId, fetcher);
  }
  getFetcher(componentId) {
    return this.fetchers.get(componentId);
  }
  setApiBasePath(path) {
    this.apiBasePath = path;
  }
  getApiBasePath() {
    return this.apiBasePath;
  }
  setBaseUrl(url) {
    this.baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
  }
  getBaseUrl() {
    return this.baseUrl;
  }
  // Method to handle URL construction
  getDataUrl(componentId, dataSource = "json", isServer = false) {
    if (isServer) {
      return `${this.baseUrl}${this.apiBasePath}?component=${componentId}&dataSource=${dataSource}`;
    }
    return `${this.apiBasePath}?component=${componentId}&dataSource=${dataSource}`;
  }
};

// src/core/BaseFetcher.ts
var BaseFetcher = class {
  constructor(options) {
    this.options = options;
  }
  getUrl(isServer, componentId) {
    const registry = FetcherRegistry.getInstance();
    if (this.options.endpoint && this.options.dataSource === "api") {
      return this.options.endpoint;
    }
    const baseUrl = registry.getBaseUrl();
    const apiPath = registry.getApiBasePath();
    if (isServer) {
      return `${baseUrl}${apiPath}?component=${componentId}&dataSource=${this.options.dataSource}`;
    }
    return `${apiPath}?component=${componentId}&dataSource=${this.options.dataSource}`;
  }
  async fetchJsonData(isServer, componentId) {
    const url = this.getUrl(isServer, componentId);
    try {
      console.log(`Fetching JSON data from: ${url}`);
      const response = await fetch(url, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      return this.parseData(data);
    } catch (error) {
      console.error(`Error fetching JSON data from ${url}:`, error);
      throw error;
    }
  }
  async fetchCsvData(isServer, componentId) {
    const url = this.getUrl(isServer, componentId);
    try {
      console.log(`Fetching CSV data from: ${url}`);
      const response = await fetch(url, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
      }
      const text = await response.text();
      const rows = text.split("\n");
      const headers = rows[0].split(",");
      const jsonData = rows.slice(1).filter((row) => row.trim() !== "").map((row) => {
        const values = row.split(",");
        return headers.reduce((obj, header, index) => {
          var _a;
          obj[header.trim()] = (_a = values[index]) == null ? void 0 : _a.trim();
          return obj;
        }, {});
      });
      return this.parseData(jsonData);
    } catch (error) {
      console.error(`Error fetching CSV data from ${url}:`, error);
      throw error;
    }
  }
  async fetchTxtData(isServer, componentId) {
    const url = this.getUrl(isServer, componentId);
    try {
      console.log(`Fetching TXT data from: ${url}`);
      const response = await fetch(url, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch TXT data: ${response.statusText}`);
      }
      const text = await response.text();
      const lines = text.split("\n");
      const jsonData = lines.filter((line) => line.trim() !== "").map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          const pairs = line.split(",");
          return pairs.reduce((obj, pair) => {
            const [key, value] = pair.split(":").map((s) => s.trim());
            if (key && value) {
              obj[key] = value;
            }
            return obj;
          }, {});
        }
      });
      return this.parseData(jsonData);
    } catch (error) {
      console.error(`Error fetching TXT data from ${url}:`, error);
      throw error;
    }
  }
  async fetchApiData(isServer, componentId) {
    const url = this.options.endpoint || "";
    if (!url || url === "") {
      console.warn(`No endpoint provided for API data source in component ${componentId}`);
      return [];
    }
    try {
      console.log(`Fetching API data from: ${url}`);
      let headers = {};
      if (process.env.NEXT_PUBLIC_RAPIDAPI_KEY && process.env.NEXT_PUBLIC_RAPIDAPI_HOST) {
        headers = {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.NEXT_PUBLIC_RAPIDAPI_HOST
        };
      }
      const response = await fetch(url, {
        headers,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch API data: ${response.statusText}`);
      }
      const data = await response.json();
      return this.parseData(data);
    } catch (error) {
      console.error(`Error fetching API data from ${url}:`, error);
      return [];
    }
  }
  async fetchData(isServer = false, componentId = this.options.componentId) {
    const dataSource = this.options.dataSource || "json";
    switch (dataSource) {
      case "json":
        return this.fetchJsonData(isServer, componentId);
      case "csv":
        return this.fetchCsvData(isServer, componentId);
      case "txt":
        return this.fetchTxtData(isServer, componentId);
      case "api":
        return this.fetchApiData(isServer, componentId);
      default:
        throw new Error(`Unsupported data source: ${dataSource}`);
    }
  }
};

// src/hocs/withClientFetching.tsx
var import_react = __toESM(require("react"));
var import_jsx_runtime = require("react/jsx-runtime");
function withClientFetching(WrappedComponent, componentId) {
  return function WithClientFetching(props) {
    const [data, setData] = import_react.default.useState([]);
    const [loading, setLoading] = import_react.default.useState(true);
    const [error, setError] = import_react.default.useState(null);
    import_react.default.useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const registry = FetcherRegistry.getInstance();
          const fetcher = registry.getFetcher(componentId);
          if (!fetcher) {
            throw new Error(`No fetcher registered for component: ${componentId}`);
          }
          const result = await fetcher.fetchData(false, componentId);
          setData(result);
        } catch (err) {
          console.error("Client fetching error:", err);
          setError(err.message || "Failed to fetch");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [componentId]);
    if (loading)
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Loading data..." });
    if (error)
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "Error: ",
        error
      ] });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WrappedComponent, { ...props, data });
  };
}

// src/hocs/withServerFetching.tsx
var import_react2 = __toESM(require("react"));
var import_jsx_runtime2 = require("react/jsx-runtime");
function withServerFetching(WrappedComponent, componentId) {
  return function WithServerFetching(props) {
    const [data, setData] = import_react2.default.useState([]);
    const [loading, setLoading] = import_react2.default.useState(true);
    const [error, setError] = import_react2.default.useState(null);
    import_react2.default.useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const registry = FetcherRegistry.getInstance();
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
          if (apiBaseUrl) {
            registry.setApiBasePath("/api/data");
            registry.setBaseUrl(apiBaseUrl);
          }
          const fetcher = registry.getFetcher(componentId);
          if (!fetcher) {
            throw new Error(`No fetcher registered for component: ${componentId}`);
          }
          const result = await fetcher.fetchData(true, componentId);
          setData(result);
        } catch (err) {
          console.error("Server fetching error:", err);
          setError(err.message || "Failed to fetch");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [componentId]);
    if (loading)
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: "Loading data..." });
    if (error)
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        "Error: ",
        error
      ] });
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(WrappedComponent, { ...props, data });
  };
}

// src/components/ListRenderers.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function ListRenderer({
  data,
  renderItem,
  title,
  className = "list-container",
  listClassName = "list",
  itemClassName = "list-item"
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: title }),
    data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "No data available" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: listClassName, children: data.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { className: itemClassName, children: renderItem(item, index) }, index)) })
  ] });
}

// src/components/Toggle.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function Toggle({ onToggleMode, onChangeDataSource, isServer, dataSource }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "toggle-container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mode-toggle", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: "Fetch Mode:" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "toggle-buttons", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            className: isServer ? "active" : "",
            onClick: () => onToggleMode(true),
            children: "Server-side"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            className: !isServer ? "active" : "",
            onClick: () => onToggleMode(false),
            children: "Client-side"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "data-source-toggle", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: "Data Source:" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "select",
        {
          value: dataSource,
          onChange: (e) => onChangeDataSource(e.target.value),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "json", children: "JSON" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "csv", children: "CSV" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "txt", children: "TXT" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "api", children: "API" })
          ]
        }
      )
    ] })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaseFetcher,
  FetcherRegistry,
  ListRenderer,
  Toggle,
  withClientFetching,
  withServerFetching
});
//# sourceMappingURL=index.js.map