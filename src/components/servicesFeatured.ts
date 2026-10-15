export interface FeaturedRef {
  projectId: string;
  serviceId: string;
}

export interface FeaturedCard {
  id: string;
  serviceId: string;
  name: string;
  highlight: string;
  image: string;
  href: string;
  external: boolean;
}

// Featured work reuses project data by id. A card links to the project's detail page
// when it has one, else to its demo; ids that are gone or have nowhere to go are skipped.
// With `lang`, internal links keep it (?lang=), so a shared ?lang=en link stays in English.
export function resolveFeatured(featured: FeaturedRef[], projects: any[], idsWithDetail: string[], lang?: 'vi' | 'en'): FeaturedCard[] {
  return (featured || []).flatMap((ref) => {
    const project = (projects || []).find((p) => p?.id === ref.projectId);
    if (!project) return [];
    const hasDetail = idsWithDetail.includes(project.id);
    const href = hasDetail ? `/projects/${project.id}/${lang ? `?lang=${lang}` : ''}` : project.links?.demo;
    if (!href) return [];
    return [{
      id: project.id,
      serviceId: ref.serviceId,
      name: project.name || '',
      highlight: project.highlight || '',
      image: project.cardBackground || '',
      href,
      external: !hasDetail
    }];
  });
}
