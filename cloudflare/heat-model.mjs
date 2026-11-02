// The publication catalog carries only durable identities needed for heat.
export function interestIndex(data) {
  return {
    forums: Object.fromEntries((data.forums ?? []).map(forum => [forum.code, (forum.talks ?? []).filter(talk => talk.type !== 'opening').map(talk => talk.id)])),
    keynotes: (data.days ?? []).flatMap(day => day.blocks.filter(block => block.kind === 'keynotes')
      .flatMap(block => (block.talks ?? []).filter(talk => talk.type !== 'opening').map(talk => talk.id))),
  };
}

export function validInterest(index) {
  const ids = value => Array.isArray(value) && value.every(id => typeof id === 'string');
  return !!index && !!index.forums && typeof index.forums === 'object' && !Array.isArray(index.forums) &&
    Object.values(index.forums).every(ids) && ids(index.keynotes);
}

export function buildHeatCatalog(conferences) {
  return new Map(conferences.map(entry => [entry.id, {
    sha256: entry.sha256, forums: entry.interest.forums,
    reports: new Map([...Object.entries(entry.interest.forums).flatMap(([code, ids]) => ids.map(id => [id, code])),
      ...entry.interest.keynotes.map(id => [id, null])]),
  }]));
}

export function aggregateInterest(catalogs, bundles) {
  const result = Object.fromEntries([...catalogs].map(([id, catalog]) => [id, {
    sha256: catalog.sha256, forums: Object.create(null), talks: Object.create(null),
  }]));
  const decoded = new Map();
  const add = (conf, kind, id, weight) => {
    const values = result[conf][kind]; values[id] = (values[id] ?? 0) + weight;
  };
  for (const bundle of bundles) {
    const direct = new Set(), forums = new Map();
    for (const encoded of bundle.follows) {
      if (!decoded.has(encoded)) {
        const [conf, kind, id] = JSON.parse(encoded), catalog = catalogs.get(conf);
        let forum;
        if (catalog && kind === 'forums' && Object.hasOwn(catalog.forums, id)) forum = id;
        if (catalog && kind === 'talks') forum = catalog.reports.get(id);
        decoded.set(encoded, forum === undefined ? null : { conf, kind, id, forum, key: JSON.stringify([conf, kind, id]) });
      }
      const item = decoded.get(encoded);
      if (!item || direct.has(item.key)) continue;
      direct.add(item.key);
      const { conf, kind, id, forum } = item;
      if (kind === 'talks') add(conf, 'talks', id, 3);
      if (forum === null) continue;
      const key = JSON.stringify([conf, 'forums', forum]);
      const state = forums.get(key) ?? { conf, forum, direct: false, count: 0 };
      if (kind === 'forums') state.direct = true;
      else state.count++;
      forums.set(key, state);
    }
    for (const { conf, forum, direct: followed, count } of forums.values()) {
      add(conf, 'forums', forum, followed ? 3 : Math.min(count, 3));
      if (!followed) continue;
      const reports = catalogs.get(conf).forums[forum];
      for (const id of reports) if (!direct.has(JSON.stringify([conf, 'talks', id]))) add(conf, 'talks', id, 1 / reports.length);
    }
  }
  return result;
}

