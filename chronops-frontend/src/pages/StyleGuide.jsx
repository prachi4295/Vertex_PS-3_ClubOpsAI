import { useState } from "react";
import {
  Star,
  Zap,
  Heart,
  Rocket,
  Bell,
  Settings,
  Check,
  AlertTriangle,
  Search,
  Plus,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Modal,
  Toast,
  IconBox,
  Gauge,
} from "../components/ui";

export default function StyleGuide() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("info");

  return (
    <div className="min-h-screen bg-neo-bg relative">
      {/* Textures */}
      <div className="fixed inset-0 texture-halftone" />
      <div className="fixed inset-0 texture-grid" />
      <div className="fixed inset-0 texture-noise" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <Star
              size={32}
              strokeWidth={3}
              className="text-neo-accent animate-spin-slow"
            />
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neo-ink">
              ClubOps Studio
            </h1>
            <Star
              size={32}
              strokeWidth={3}
              className="text-neo-secondary animate-spin-slow"
            />
          </div>
          <Badge color="dark" rotate>
            Neo-Brutalist Design System
          </Badge>
        </header>

        {/* ─── BUTTONS ─── */}
        <Section title="Buttons" icon={Zap}>
          <div className="space-y-6">
            <Row label="Variants">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </Row>
            <Row label="Sizes">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row label="With Icons">
              <Button variant="primary">
                <Rocket size={18} strokeWidth={3} /> Launch
              </Button>
              <Button variant="secondary">
                <Plus size={18} strokeWidth={3} /> Add Task
              </Button>
            </Row>
            <Row label="States">
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </Row>
          </div>
        </Section>

        {/* ─── CARDS ─── */}
        <Section title="Cards" icon={Heart}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <p className="font-bold">Default card with content. Hover to see the lift effect.</p>
            </Card>
            <Card
              headerContent="Backlog"
              headerColor="bg-neo-muted"
            >
              <p className="font-bold">Card with muted header.</p>
            </Card>
            <Card
              headerContent="In Progress"
              headerColor="bg-neo-secondary"
            >
              <p className="font-bold">Card with yellow header.</p>
            </Card>
            <Card
              headerContent={
                <span className="flex items-center gap-2 text-neo-white">
                  <Check size={16} strokeWidth={3} /> Done
                </span>
              }
              headerColor="bg-neo-ink"
            >
              <p className="font-bold">Card with dark header.</p>
            </Card>
            <Card
              headerContent="Warning"
              headerColor="bg-neo-accent"
            >
              <p className="font-bold">Card with accent header.</p>
            </Card>
          </div>
        </Section>

        {/* ─── BADGES ─── */}
        <Section title="Badges" icon={Star}>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge color="accent">Urgent</Badge>
            <Badge color="secondary">In Progress</Badge>
            <Badge color="muted">Backlog</Badge>
            <Badge color="dark">Completed</Badge>
            <Badge color="white">Default</Badge>
            <Badge color="accent" rotate>
              Rotated
            </Badge>
            <Badge color="secondary" rotate>
              Sticker
            </Badge>
          </div>
        </Section>

        {/* ─── INPUTS ─── */}
        <Section title="Input & Textarea" icon={Search}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider">
                Text Input
              </label>
              <Input placeholder="Type something bold..." />
            </div>
            <div className="space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider">
                Search Input
              </label>
              <Input placeholder="Search tasks..." type="search" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="font-bold text-sm uppercase tracking-wider">
                Textarea
              </label>
              <Textarea placeholder="Paste your meeting notes here..." />
            </div>
          </div>
        </Section>

        {/* ─── ICON BOXES ─── */}
        <Section title="Icon Boxes" icon={Settings}>
          <div className="space-y-4">
            <Row label="Colors">
              <IconBox icon={Star} color="default" />
              <IconBox icon={Zap} color="accent" />
              <IconBox icon={Heart} color="secondary" />
              <IconBox icon={Bell} color="muted" />
              <IconBox icon={Rocket} color="dark" />
            </Row>
            <Row label="Sizes">
              <IconBox icon={Star} size="sm" color="accent" />
              <IconBox icon={Star} size="md" color="secondary" />
              <IconBox icon={Star} size="lg" color="muted" />
            </Row>
          </div>
        </Section>

        {/* ─── GAUGES ─── */}
        <Section title="Gauges" icon={AlertTriangle}>
          <div className="flex flex-wrap gap-8 items-end">
            <Gauge value={25} label="Tasks" />
            <Gauge value={50} label="Budget" />
            <Gauge value={75} label="Risk" />
            <Gauge value={100} label="Complete" />
            <Gauge value={0} label="Empty" />
          </div>
        </Section>

        {/* ─── MODAL ─── */}
        <Section title="Modal" icon={Bell}>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirm Action"
          >
            <p className="font-bold mb-4">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Confirm
              </Button>
            </div>
          </Modal>
        </Section>

        {/* ─── TOAST ─── */}
        <Section title="Toast Notifications" icon={Bell}>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setToastType("info");
                setToastVisible(true);
              }}
            >
              Info Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setToastType("success");
                setToastVisible(true);
              }}
            >
              Success Toast
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setToastType("error");
                setToastVisible(true);
              }}
            >
              Error Toast
            </Button>
          </div>
          <Toast
            message={`This is a ${toastType} notification!`}
            type={toastType}
            visible={toastVisible}
            action={{ label: "Undo", onClick: () => console.log("Undo!") }}
            onClose={() => setToastVisible(false)}
          />
        </Section>

        {/* ─── TEXTURES DEMO ─── */}
        <Section title="Textures & Decorations" icon={Star}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="relative h-32 border-4 border-neo-ink bg-neo-white overflow-hidden">
              <div className="absolute inset-0 texture-halftone !opacity-20" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider">
                Halftone
              </span>
            </div>
            <div className="relative h-32 border-4 border-neo-ink bg-neo-white overflow-hidden">
              <div className="absolute inset-0 texture-grid !opacity-20" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider">
                Grid
              </span>
            </div>
            <div className="relative h-32 border-4 border-neo-ink bg-neo-white overflow-hidden">
              <div className="absolute inset-0 texture-noise !opacity-20" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider">
                Noise
              </span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Star
              size={40}
              strokeWidth={3}
              className="text-neo-accent animate-spin-slow"
            />
            <span className="font-bold uppercase tracking-wider text-sm">
              Slow-spinning star decoration
            </span>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ─── Layout helpers ─── */

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-neo-secondary border-4 border-neo-ink p-2 shadow-neo-sm rotate-[-2deg]">
          <Icon size={20} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-neo-ink">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <p className="font-bold text-xs uppercase tracking-wider mb-3 text-neo-ink/70">
        {label}
      </p>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </div>
  );
}
