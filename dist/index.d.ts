import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

type DataSourceType = "json" | "csv" | "txt" | "api";
interface FetcherOptions {
    dataSource?: DataSourceType;
    componentId: string;
    endpoint?: string;
}
declare abstract class BaseFetcher<T> {
    protected options: FetcherOptions;
    constructor(options: FetcherOptions);
    abstract parseData(data: any): T[];
    private getUrl;
    fetchJsonData(isServer: boolean, componentId: string): Promise<T[]>;
    fetchCsvData(isServer: boolean, componentId: string): Promise<T[]>;
    fetchTxtData(isServer: boolean, componentId: string): Promise<T[]>;
    fetchApiData(isServer: boolean, componentId: string): Promise<T[]>;
    fetchData(isServer?: boolean, componentId?: string): Promise<T[]>;
}

declare class FetcherRegistry {
    private static instance;
    private fetchers;
    private apiBasePath;
    private baseUrl;
    private constructor();
    static getInstance(): FetcherRegistry;
    register(componentId: string, fetcher: BaseFetcher<any>): void;
    getFetcher(componentId: string): BaseFetcher<any> | undefined;
    setApiBasePath(path: string): void;
    getApiBasePath(): string;
    setBaseUrl(url: string): void;
    getBaseUrl(): string;
    getDataUrl(componentId: string, dataSource?: DataSourceType, isServer?: boolean): string;
}

declare function withClientFetching<T, P extends {
    data?: T[];
}>(WrappedComponent: React.ComponentType<P>, componentId: string): (props: Omit<P, "data">) => react_jsx_runtime.JSX.Element;

declare function withServerFetching<T, P extends {
    data?: T[];
}>(WrappedComponent: React.ComponentType<P>, componentId: string): (props: Omit<P, "data">) => react_jsx_runtime.JSX.Element;

interface ListRendererProps<T> {
    data: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    title: string;
    className?: string;
    listClassName?: string;
    itemClassName?: string;
}
declare function ListRenderer<T>({ data, renderItem, title, className, listClassName, itemClassName, }: ListRendererProps<T>): react_jsx_runtime.JSX.Element;

interface ToggleProps {
    onToggleMode: (isServer: boolean) => void;
    onChangeDataSource: (dataSource: DataSourceType) => void;
    isServer: boolean;
    dataSource: DataSourceType;
}
declare function Toggle({ onToggleMode, onChangeDataSource, isServer, dataSource }: ToggleProps): react_jsx_runtime.JSX.Element;

export { BaseFetcher, DataSourceType, FetcherOptions, FetcherRegistry, ListRenderer, Toggle, withClientFetching, withServerFetching };
