import { AbstractResourceProvider, UserPrompt } from "@iepaas/resource-provider-abstract"
import { IepaasApiClient } from "@iepaas/js-client"
import { AbstractKeyValueStore } from "@iepaas/abstract-key-value-store"
import { Machine } from "./Machine"
import { Snapshot } from "./Snapshot"
import { MachineType } from "./MachineType"

export abstract class AbstractMachineProvider extends AbstractResourceProvider {
	constructor(appName: string, store: AbstractKeyValueStore) {
		super(appName, store)
	}

	async registerPrompts(): Promise<Array<UserPrompt>> {
		return [
			{
				name: "repoUrl",
				description: "The URL of the git repository of the app. " +
					"It must be publicly accessible.",
				type: "text",
				required: true
			}
		]
	}

	protected abstract buildIepaasInfrastructure(): Promise<Machine>

	public abstract createMachine(
		type: MachineType,
		initCommands: Array<string>,
		snapshot?: Snapshot
	): Promise<Machine>
	public abstract destroyMachine(machine: Machine): Promise<void>
	public abstract takeSnapshot(machine: Machine): Promise<Snapshot>
	public abstract deleteSnapshot(snapshot: Snapshot): Promise<void>
	public abstract verifyCredentials(): Promise<boolean>

	public async createIepaasServer(): Promise<string> {
		const machine = await this.buildIepaasInfrastructure()
		const iepaas = new IepaasApiClient(machine.address)

		const body = {} as any
		const config = await this.getAllConfigValues()

		config.forEach(it => {
			body[it.key] = it.value
		})

		const repoUrlKey = `${this.providerName}:repoUrl`
		const repoUrl = body[repoUrlKey]
		delete body[repoUrlKey]

		await iepaas.initialize({
			repoUrl,
			config: body
		})

		return machine.address
	}
}
