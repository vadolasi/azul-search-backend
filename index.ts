import { firefox } from "playwright"
import { Server } from "hyper-express"
import Queue from "p-queue"
import cron from "node-cron"

const RESOURCE_EXCLUSTIONS = ["image", "stylesheet", "media", "font","other"]
const proxyPorts = [-1, 8021, 8022, 8023, 8024, 8025, 8026, 8027, 8028, 8029, 8030, 8011, 8012, 8013, 8014, 8015, 8016, 8017, 8018, 8019, 8020, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010]
const proxyHost = "https://ddc.oxylabs.io"
const proxyUser = "thomas389507"
const proxyPass = "TuoihiMua78T5e36buybu#35"

const app = new Server()

const queue = new Queue({ concurrency: 4 })

const browser = await firefox.launch({ headless: false })

let currentProxyPort = 0

app.get("/", async (req, res) => {
  const url = req.query.url as string

  const proxyPort = proxyPorts[currentProxyPort]
  currentProxyPort++
  if (currentProxyPort >= proxyPorts.length) {
    currentProxyPort = 0
  }

  if (!url) {
    res.status(400).send("Missing url")
    return
  }

  await queue.add(async () => {
    const context = await browser.newContext({
      proxy: proxyPort === -1 ? undefined : {
        server: `${proxyHost}:${proxyPort}`,
        username: proxyUser,
        password: proxyPass
      },
      ignoreHTTPSErrors: true
    })
    await context.clearCookies()
    await context.route("**/*", (route) => {
      return RESOURCE_EXCLUSTIONS.includes(route.request().resourceType())
        ? route.abort()
        : route.continue()
    })
    try {
      const page = await context.newPage()
      await page.goto("https://interline.tudoazul.com/")
      await page.goto(url)
      const text = JSON.parse(await page.textContent("pre") ?? "{}")

      res.json(text)
    } catch (e) {
      res.status(500).send("Error")
    } finally {
      await context.close()
    }
  })
})

await app.listen(8000)

console.log("Listening on http://localhost:8000")
