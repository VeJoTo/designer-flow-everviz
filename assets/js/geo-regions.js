// Geographic targets for every map surface. No DOM, no Leaflet.
// center = [lat, lng]; zoom = Leaflet zoom integer. window.GeoRegions.
(function (global) {
  const WORLD = { center: [20, 0], zoom: 2 };

  // Region slugs used across the prototype (match assets/img/maps/*.png names
  // and the library `map-card--<slug>` modifiers).
  const REGIONS = {
    world:            { center: [20, 0],        zoom: 2 },
    europe:           { center: [50, 12],       zoom: 4 },
    "north-europe":   { center: [58, 12],       zoom: 4 },
    scandinavia:      { center: [63, 15],       zoom: 4 },
    uk:               { center: [54.5, -2.5],   zoom: 5 },
    "central-europe": { center: [48, 14],       zoom: 5 },
    mediterranean:    { center: [40, 15],       zoom: 4 },
    "north-africa":   { center: [25, 12],       zoom: 4 },
    "middle-east":    { center: [29, 45],       zoom: 4 },
    "north-america":  { center: [45, -100],     zoom: 3 },
    "south-america":  { center: [-15, -60],     zoom: 3 },
    "asia-east":      { center: [35, 115],      zoom: 3 },
    "asia-india":     { center: [22, 79],       zoom: 4 },
    australia:        { center: [-25, 134],     zoom: 3 },
  };

  // Minimap level types → a representative view. Presets aren't region-bound,
  // so political levels default to a Nordic/European frame that reads clearly.
  const LEVELS = {
    globe:     { center: [20, 0],         zoom: 2 },
    continent: { center: [50, 12],        zoom: 3 },
    country:   { center: [61, 9],         zoom: 5 },
    region:    { center: [60, 10],        zoom: 6 },
    city:      { center: [59.91, 10.75],  zoom: 10 }, // Oslo
  };

  // Wizard preview "stages" (the map-pick data-thumb ids) → a region view.
  const STAGES = {
    globe:          REGIONS.world,
    satellite:      REGIONS.world,
    "evening-news": REGIONS["north-europe"],
    "nrk-nyheter":  REGIONS.scandinavia,
    anwar:          REGIONS.europe,
    olympics:       REGIONS.world,
    "untitled-base":REGIONS.world,
  };

  global.GeoRegions = {
    region: (slug) => REGIONS[slug] || WORLD,
    level:  (type) => LEVELS[type] || WORLD,
    stage:  (id)   => STAGES[id]   || WORLD,
    has:    (slug) => Object.prototype.hasOwnProperty.call(REGIONS, slug),
  };
})(window);
