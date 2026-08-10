/** Read-only listing to identify existing accounts before a manual super_admin bootstrap. */
import { connectDatabase, disconnectDatabase } from './src/config/database'
import { User } from './src/models/User.model'
import { Profile } from './src/models/Profile.model'

async function main() {
  await connectDatabase()
  try {
    const users = await User.find().sort({ createdAt: 1 })
    for (const user of users) {
      const profile = await Profile.findOne({ userId: user._id })
      console.log(
        `${user.email}  |  role: ${user.role}  |  status: ${user.status}  |  provider: ${user.authProvider}  |  name: ${profile?.name ?? '(no profile)'}  |  created: ${user.createdAt?.toISOString()}`,
      )
    }
    console.log(`\n${users.length} total user(s)`)
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
