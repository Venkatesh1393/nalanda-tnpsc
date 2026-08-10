import { motion } from 'framer-motion'
import { BookOpen, Info, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Autocomplete } from '@/components/inputs/autocomplete'
import { OtpInput } from '@/components/inputs/otp-input'
import { PasswordInput } from '@/components/inputs/password-input'
import { SearchInput } from '@/components/inputs/search-input'
import { BreadcrumbTrail } from '@/components/breadcrumb-trail'
import { ChartContainer } from '@/components/charts/chart-container'
import { CircularProgress } from '@/components/charts/circular-progress'
import { ScoreRing } from '@/components/charts/score-ring'
import { TrendLineChart } from '@/components/charts/trend-line-chart'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { FeatureCard } from '@/components/feature-card'
import { FormField } from '@/components/form-field'
import { Label } from '@/components/ui/label'
import { NotFound } from '@/components/not-found'
import { PremiumCard } from '@/components/premium-card'
import { QuestionCard } from '@/components/question-card'
import { Spinner } from '@/components/spinner'
import { StatCard } from '@/components/stat-card'
import { SubjectCard } from '@/components/subject-card'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES } from '@/constants/exam'
import { isDevelopment } from '@/lib/env'
import { StreakFlameIcon } from '@/icons/streak-flame-icon'

// Illustrative example data for this design-system preview only — not real
// product content (docs/CLAUDE.md's "never use dummy data" rule governs the
// actual product; this screen exists purely to verify components render
// and theme correctly, the same role a Storybook story would play).
const exampleTrend = [
  { label: 'Week 1', value: 58 },
  { label: 'Week 2', value: 64 },
  { label: 'Week 3', value: 61 },
  { label: 'Week 4', value: 72 },
  { label: 'Week 5', value: 78 },
]

const exampleRankers = [
  { name: 'Example Aspirant A', exam: 'Group 4', percentile: 98 },
  { name: 'Example Aspirant B', exam: 'Group 2', percentile: 95 },
  { name: 'Example Aspirant C', exam: 'VAO', percentile: 93 },
]

const examOptions = EXAM_CATEGORIES.map((exam) => ({
  value: exam.id,
  label: exam.label.en,
}))

const questionOptions = [
  { id: 'a', text: 'Chennai' },
  { id: 'b', text: 'Madurai' },
  { id: 'c', text: 'Tiruchirappalli' },
  { id: 'd', text: 'Salem' },
]

const rankerColumns: ColumnDef<(typeof exampleRankers)[number]>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Aspirant" />,
  },
  {
    accessorKey: 'exam',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Exam" />,
  },
  {
    accessorKey: 'percentile',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Percentile" />,
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
  },
]

/**
 * Design-system preview / foundation-verification screen — confirms every
 * reusable component (Typography, Buttons, Cards, Inputs, Badges, Tables,
 * Charts, Overlays, Data Table, States) renders correctly and reacts to the
 * light/dark theme end-to-end. Not a real application page — see
 * src/pages/README.md and src/routes/README.md for why no real routing
 * exists yet.
 */
function App() {
  const [emailError] = useState<string | undefined>(undefined)
  const [otpValue, setOtpValue] = useState('')
  const [autocompleteValue, setAutocompleteValue] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [sliderValue, setSliderValue] = useState([40])
  const [selectedQuestionOption, setSelectedQuestionOption] = useState<string | null>(
    null,
  )

  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
        {/* Hero / foundation confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3 pt-8 text-center"
        >
          <span className="bg-ai-teal/10 text-ai-teal flex size-12 items-center justify-center rounded-full">
            <Sparkles className="size-6" />
          </span>
          <Heading variant="heading-1">Nalanda TNPSC — Design System</Heading>
          <Text variant="body-lg" className="text-muted-foreground max-w-md">
            Every reusable component below follows docs/UI_Design_System.md. This is a
            component preview, not a real application page.
          </Text>
          {isDevelopment && (
            <Text variant="caption" className="font-mono">
              environment: development
            </Text>
          )}
        </motion.div>

        <motion.div
          variants={staggerChildren()}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-10"
        >
          {/* Typography */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-2">
            <Text variant="overline">Typography</Text>
            <Heading variant="display">Display</Heading>
            <Heading variant="heading-1">Heading 1</Heading>
            <Heading variant="heading-2">Heading 2</Heading>
            <Heading variant="heading-3">Heading 3</Heading>
            <Heading variant="heading-4">Heading 4</Heading>
            <Text variant="body-lg">Body large — primary reading text.</Text>
            <Text variant="body-md">Body medium — default UI text.</Text>
            <Text variant="body-sm">Body small — secondary/supporting text.</Text>
            <Text variant="caption">Caption — labels, metadata.</Text>
          </motion.section>

          {/* Buttons */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Buttons</Text>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ai">
                <Sparkles /> Ask AI
              </Button>
              <Button variant="default" loading>
                Loading
              </Button>
              <Button variant="default" disabled>
                Disabled
              </Button>
            </div>
          </motion.section>

          {/* Cards */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Cards</Text>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informational Card</CardTitle>
                  <CardDescription>Not clickable — no hover treatment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text variant="body-sm">Standard card chrome per §14.</Text>
                </CardContent>
              </Card>
              <Card interactive tabIndex={0}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StreakFlameIcon className="text-premium-gold size-4" />
                    Interactive Card
                  </CardTitle>
                  <CardDescription>Hover to see the primary-tinted ring.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text variant="body-sm">Used for tappable/navigable cards.</Text>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* Composite Cards */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Composite Cards</Text>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={Sparkles}
                title="AI Tutor"
                description="Instant doubt resolution and personalized explanations, in Tamil or English."
                ai
                onLearnMore={() => {}}
              />
              <SubjectCard
                icon={BookOpen}
                name="General Science"
                itemCountLabel="12 topics"
                progress={64}
                onSelect={() => {}}
              />
              <StatCard
                label="Current Streak"
                value="12 days"
                icon={Target}
                trend={3}
                trendLabel="vs last week"
              />
              <PremiumCard
                unlockLabel="Unlock unlimited mock tests with Plus"
                onUnlock={() => {}}
              >
                <div className="flex flex-col gap-2 p-4">
                  <Text variant="body-lg" className="font-medium">
                    TNPSC Group 4 — Full Mock #12
                  </Text>
                  <Text variant="body-sm">
                    100 questions · 3 hours · Negative marking
                  </Text>
                </div>
              </PremiumCard>
            </div>
            <QuestionCard
              questionText="Which city is the capital of Tamil Nadu?"
              options={questionOptions}
              difficulty="easy"
              selectedOptionId={selectedQuestionOption}
              onSelectOption={setSelectedQuestionOption}
            />
            <QuestionCard
              questionText="Which city is the capital of Tamil Nadu? (revealed / Review mode)"
              options={questionOptions}
              difficulty="easy"
              selectedOptionId="b"
              correctOptionId="a"
            />
          </motion.section>

          {/* Inputs */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Inputs</Text>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={emailError}
                hint="We'll never share this with anyone."
              />
              <FormField label="Exam target month" placeholder="e.g. December 2026" />
              <div className="flex flex-col gap-1.5">
                <Text variant="body-sm" className="font-medium">
                  Search
                </Text>
                <SearchInput placeholder="Search topics, questions..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Text variant="body-sm" className="font-medium">
                  Password
                </Text>
                <PasswordInput placeholder="Enter password" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Text variant="body-sm" className="font-medium">
                  Dropdown (Select)
                </Text>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {examOptions.map((exam) => (
                      <SelectItem key={exam.value} value={exam.value}>
                        {exam.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Text variant="body-sm" className="font-medium">
                  Autocomplete
                </Text>
                <Autocomplete
                  options={examOptions}
                  value={autocompleteValue}
                  onChange={setAutocompleteValue}
                  placeholder="Search exams..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Text variant="body-sm" className="font-medium">
                OTP Input
              </Text>
              <div className="flex flex-wrap items-center gap-4">
                <OtpInput value={otpValue} onChange={setOtpValue} status="default" />
                <OtpInput value="123456" onChange={() => {}} status="success" />
                <OtpInput value="483" onChange={() => {}} status="error" />
                <OtpInput value="000000" onChange={() => {}} status="locked" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="preview-checkbox" defaultChecked />
                <Label htmlFor="preview-checkbox">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="preview-switch" defaultChecked />
                <Label htmlFor="preview-switch">Switch</Label>
              </div>
              <RadioGroup defaultValue="ta" className="flex flex-row gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ta" id="preview-radio-ta" />
                  <Label htmlFor="preview-radio-ta">தமிழ்</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="en" id="preview-radio-en" />
                  <Label htmlFor="preview-radio-en">English</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex max-w-xs flex-col gap-1.5">
              <Text variant="body-sm" className="font-medium">
                Slider ({sliderValue[0]})
              </Text>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
              />
            </div>
          </motion.section>

          {/* Progress & Loading */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Progress &amp; Loading</Text>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex w-full max-w-xs flex-col gap-1.5">
                <Text variant="body-sm">Progress Bar</Text>
                <Progress value={64} />
              </div>
              <CircularProgress value={42} size={72} strokeWidth={7}>
                <Target className="text-primary size-5" />
              </CircularProgress>
              <Spinner size="lg" />
            </div>
            <div className="flex flex-col gap-2">
              <Text variant="body-sm">Skeleton Loader</Text>
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Navigation & Disclosure */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-4">
            <Text variant="overline">Navigation &amp; Disclosure</Text>

            <BreadcrumbTrail
              segments={[
                { label: 'Learn' },
                { label: 'General Science' },
                { label: 'Physics' },
                { label: 'Units & Measurement' },
                { label: 'Laws of Motion' },
              ]}
            />

            <Tabs defaultValue="quiz" className="w-full">
              <TabsList>
                <TabsTrigger value="quiz">Topic Quiz</TabsTrigger>
                <TabsTrigger value="mock">Mock Test</TabsTrigger>
                <TabsTrigger value="pyq">PYQ</TabsTrigger>
              </TabsList>
              <TabsContent value="quiz">
                <Text variant="body-sm">Adaptive, topic-scoped practice.</Text>
              </TabsContent>
              <TabsContent value="mock">
                <Text variant="body-sm">Full-length, exam-condition test.</Text>
              </TabsContent>
              <TabsContent value="pyq">
                <Text variant="body-sm">Previous year questions, by year.</Text>
              </TabsContent>
            </Tabs>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is the 100 Questions mode?</AccordionTrigger>
                <AccordionContent>
                  A fixed-length, full-syllabus mixed set sized to mirror an actual TNPSC
                  paper — the platform&apos;s flagship practice session.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is Tamil supported everywhere?</AccordionTrigger>
                <AccordionContent>
                  Yes — Tamil is a first-class citizen throughout, never a smaller or
                  secondary translation.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src="" alt="" />
                  <AvatarFallback>NT</AvatarFallback>
                </Avatar>
                <Text variant="body-sm">Avatar</Text>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="More info">
                    <Info />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tooltip content</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Open Popover
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Text variant="body-sm">Popover content, anchored to its trigger.</Text>
                </PopoverContent>
              </Popover>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </motion.section>

          {/* Overlays */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Overlays</Text>
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Downgrade to Free?</DialogTitle>
                    <DialogDescription>
                      Downgrading removes AI Mains evaluation and deep analytics.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive">Downgrade</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Mark for review?</DrawerTitle>
                    <DrawerDescription>
                      Mobile bottom-sheet convention for contextual actions.
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <Button>Mark for Review</Button>
                    <DrawerClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <Button
                variant="outline"
                onClick={() =>
                  toast.success('Bookmarked for revision', {
                    description: 'Find it later in Bookmarks.',
                  })
                }
              >
                Trigger Toast
              </Button>
            </div>
          </motion.section>

          {/* Badges */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Badges</Text>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Active</Badge>
              <Badge variant="warning">Expiring Soon</Badge>
              <Badge variant="destructive">Failed</Badge>
              <Badge variant="outline">Easy</Badge>
              <Badge variant="premium">Pro</Badge>
            </div>
          </motion.section>

          {/* Tables */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Tables</Text>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aspirant</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead className="text-right">Percentile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exampleRankers.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.exam}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.percentile}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.section>

          {/* Data Table */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Data Table</Text>
            <DataTable columns={rankerColumns} data={exampleRankers} showDensityToggle />
          </motion.section>

          {/* Charts */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Charts</Text>
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <ScoreRing value={78} label="Percentile" />
              <TrendLineChart data={exampleTrend} />
            </div>
            <ChartContainer
              title="Accuracy Trend"
              description="Last 5 weeks"
              updatedAtLabel="2 minutes ago"
            >
              <TrendLineChart data={exampleTrend} color="var(--chart-2)" />
            </ChartContainer>
          </motion.section>

          {/* States */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <Text variant="overline">Empty / Error / Not Found States</Text>
            <div className="grid gap-4 sm:grid-cols-3">
              <EmptyState
                title="Nothing bookmarked yet"
                description="Save notes and questions to revisit later."
                actionLabel="Browse Topics"
                onAction={() => {}}
              />
              <ErrorState onRetry={() => {}} />
              <NotFound onAction={() => {}} />
            </div>
          </motion.section>
        </motion.div>
      </main>
      <Footer />
    </>
  )
}

export default App
