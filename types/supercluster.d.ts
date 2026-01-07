/**
 * Type definitions for supercluster
 * Custom declaration file since @types/supercluster doesn't exist for v8
 */

declare module 'supercluster' {
  export interface Options<P, C> {
    minZoom?: number;
    maxZoom?: number;
    minPoints?: number;
    radius?: number;
    extent?: number;
    nodeSize?: number;
    log?: boolean;
    generateId?: boolean;
    map?: (props: P) => P;
    reduce?: (accumulated: C, props: P) => void;
  }

  export interface ClusterFeature<P, C> {
    type: 'Feature';
    id?: number | string;
    properties: {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
      point_count_abbreviated?: number;
    } & P & C;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }

  export interface PointFeature<P> {
    type: 'Feature';
    id?: number | string;
    properties: P;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }

  export type AnyFeature<P, C> = ClusterFeature<P, C> | PointFeature<P>;

  export default class Supercluster<P = any, C = any> {
    constructor(options?: Options<P, C>);
    load(points: PointFeature<P>[]): Supercluster<P, C>;
    getClusters(bbox: [number, number, number, number], zoom: number): ClusterFeature<P, C>[];
    getChildren(clusterId: number): PointFeature<P>[];
    getLeaves(clusterId: number, limit?: number, offset?: number): PointFeature<P>[];
    getTile(z: number, x: number, y: number): {
      features: AnyFeature<P, C>[];
    } | null;
    getClusterExpansionZoom(clusterId: number): number;
  }
}

