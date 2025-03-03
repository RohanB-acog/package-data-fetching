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
import React from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function withClientFetching(WrappedComponent, componentId) {
  return function WithClientFetching(props) {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
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
      return /* @__PURE__ */ jsx("div", { children: "Loading data..." });
    if (error)
      return /* @__PURE__ */ jsxs("div", { children: [
        "Error: ",
        error
      ] });
    return /* @__PURE__ */ jsx(WrappedComponent, { ...props, data });
  };
}

// src/hocs/withServerFetching.tsx
import React2 from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function withServerFetching(WrappedComponent, componentId) {
  return function WithServerFetching(props) {
    const [data, setData] = React2.useState([]);
    const [loading, setLoading] = React2.useState(true);
    const [error, setError] = React2.useState(null);
    React2.useEffect(() => {
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
      return /* @__PURE__ */ jsx2("div", { children: "Loading data..." });
    if (error)
      return /* @__PURE__ */ jsxs2("div", { children: [
        "Error: ",
        error
      ] });
    return /* @__PURE__ */ jsx2(WrappedComponent, { ...props, data });
  };
}

// src/components/ListRenderers.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function ListRenderer({
  data,
  renderItem,
  title,
  className = "list-container",
  listClassName = "list",
  itemClassName = "list-item"
}) {
  return /* @__PURE__ */ jsxs3("div", { className, children: [
    /* @__PURE__ */ jsx3("h2", { children: title }),
    data.length === 0 ? /* @__PURE__ */ jsx3("p", { children: "No data available" }) : /* @__PURE__ */ jsx3("ul", { className: listClassName, children: data.map((item, index) => /* @__PURE__ */ jsx3("li", { className: itemClassName, children: renderItem(item, index) }, index)) })
  ] });
}

// src/components/Toggle.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function Toggle({ onToggleMode, onChangeDataSource, isServer, dataSource }) {
  return /* @__PURE__ */ jsxs4("div", { className: "toggle-container", children: [
    /* @__PURE__ */ jsxs4("div", { className: "mode-toggle", children: [
      /* @__PURE__ */ jsx4("h3", { children: "Fetch Mode:" }),
      /* @__PURE__ */ jsxs4("div", { className: "toggle-buttons", children: [
        /* @__PURE__ */ jsx4(
          "button",
          {
            className: isServer ? "active" : "",
            onClick: () => onToggleMode(true),
            children: "Server-side"
          }
        ),
        /* @__PURE__ */ jsx4(
          "button",
          {
            className: !isServer ? "active" : "",
            onClick: () => onToggleMode(false),
            children: "Client-side"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs4("div", { className: "data-source-toggle", children: [
      /* @__PURE__ */ jsx4("h3", { children: "Data Source:" }),
      /* @__PURE__ */ jsxs4(
        "select",
        {
          value: dataSource,
          onChange: (e) => onChangeDataSource(e.target.value),
          children: [
            /* @__PURE__ */ jsx4("option", { value: "json", children: "JSON" }),
            /* @__PURE__ */ jsx4("option", { value: "csv", children: "CSV" }),
            /* @__PURE__ */ jsx4("option", { value: "txt", children: "TXT" }),
            /* @__PURE__ */ jsx4("option", { value: "api", children: "API" })
          ]
        }
      )
    ] })
  ] });
}
export {
  BaseFetcher,
  FetcherRegistry,
  ListRenderer,
  Toggle,
  withClientFetching,
  withServerFetching
};
//# sourceMappingURL=index.mjs.map