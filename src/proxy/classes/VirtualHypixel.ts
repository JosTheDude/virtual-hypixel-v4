import { configInterface } from "../interfaces/configInterface"
import { ModuleBase } from "../modules/base/ModuleBase"
import { InstantConnectProxy } from "prismarine-proxy"
import { WindowManager } from "./window/WindowManager"
import {Client, PacketMeta} from "minecraft-protocol"
import { logger } from "../../utils/logger"
import {PacketFilter} from "../modules/PacketFilter";

/**
 * Main Virtual Hypixel Class
 */
export class VirtualHypixel {

    version: string = "v4-beta-0.0.1"

    // game stuff
    proxy: InstantConnectProxy
    client: Client | undefined

    // modules and stuff
    windowManager: WindowManager = new WindowManager()
    modules: ModuleBase[] = []

    constructor(public config: configInterface) {
        logger.info(`Starting Virtual Hypixel ${this.version}...`)

        this.proxy =  new InstantConnectProxy({
            loginHandler: (client) => {
                this.client = client

                logger.info(`Logging in as ${client.profile.name}...`)
                logger.info(`Loading modules...`)

                this.modules.push(new PacketFilter(this.client, this))

                return { username: config.account.email, password: config.account.password, auth: config.account.auth }
            },
            serverOptions: {
                version: "1.8.9",
                motd: `Virtual Hypixel Server`,
                maxPlayers: 69,
                //favicon: fs.readFileSync("./data/favicon.txt").toString()
            },
            clientOptions: {
                version: "1.8.9",
                host: "hypixel.net"
            }
        })

        // @ts-ignore
        this.proxy.on('incoming', (data, meta, toClient, toServer) => {
            const handled = this.handlePacket(meta, data, toServer, false)
            if (!handled.intercept)
                toClient.write(handled.meta.name, handled.data)
        })

        // @ts-ignore
        this.proxy.on('outgoing', (data, meta, toClient, toServer) => {
            let winIntercept = this.windowManager.onOutPacket(meta, data, toServer)

            const handled = this.handlePacket(meta, data, toServer, true)

            if (!winIntercept && !handled.intercept)
                toServer.write(handled.meta.name, handled.data)
        })

        logger.info(`Ready! Connect to "localhost" to start playing!`)
    }

    handlePacket(meta: PacketMeta, data: any, toServer: Client, out: boolean): { intercept: boolean, meta: PacketMeta, data: any } {
        let intercept = false
        for (const module of this.modules) {
            let applied
            if (out)
                applied = module.onOutPacket(meta, data, toServer)
            else
                applied = module.onInPacket(meta, data, toServer)

            if (applied[0]) {
                intercept = true
            } else {
                data = applied[1]
            }
        }

        return { intercept, meta, data }
    }

}