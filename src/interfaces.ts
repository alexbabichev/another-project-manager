
export interface ProjectNode
{
	title: string,
	type?: string,
	path?: string,
	description?: string;
	nodes?: ProjectNode[];
}