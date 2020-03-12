
export interface ProjectGroup {
	title: string;
	type?: string;
	description?: string;
	nodes: Project[] | ProjectGroup[];
}

export interface Project {
	title: string;
	description?: string;
	path: string;
}