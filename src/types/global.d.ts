interface Window {
  gtag: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string,
    config?: ControlParams | EventParams | ConfigParams | CustomParams
  ) => void;
  dataLayer: any[];
}

declare var gtag: (
  command: 'config' | 'event' | 'js' | 'set',
  targetId: string,
  config?: any
) => void;
