"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type View = "overview" | "revenue" | "exchange" | "tokens" | "leases";
type BuyerView = "dashboard" | "compute" | "contracts" | "auctions" | "market";
type Role = "supplier" | "buyer";
type Workflow = "token" | "lease";
type WorkflowStep = 1 | 2 | 3 | 4;

type Toast = {
  title: string;
  detail: string;
} | null;

type DevnetReceipt = {
  amount: number;
  explorerUrl: string;
  inventoryOwner: string;
  mintAddress: string;
  network: "devnet";
  signature: string;
};

type TokenIssuance =
  | { status: "idle" }
  | { status: "issuing" }
  | { status: "confirmed"; receipt: DevnetReceipt }
  | { status: "failed"; message: string };

const navigation: { id: View; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "O" },
  { id: "exchange", label: "Exchange", short: "E" },
  { id: "tokens", label: "Tokenized Compute", short: "T" },
  { id: "leases", label: "Lease Compute", short: "L" },
  { id: "revenue", label: "Revenue", short: "R" },
];

const buyerNavigation: { id: BuyerView; label: string; short: string }[] = [
  { id: "dashboard", label: "Dashboard", short: "D" },
  { id: "compute", label: "Buy Compute", short: "C" },
  { id: "contracts", label: "Contracts & Transfer", short: "R" },
  { id: "auctions", label: "Compute Auctions", short: "A" },
  { id: "market", label: "Compute Market", short: "M" },
];

function Arrow() {
  return <span aria-hidden="true" className="arrow">→</span>;
}

function CheckIcon() {
  return <span aria-hidden="true" className="check-icon">✓</span>;
}

function SparkIcon() {
  return <span aria-hidden="true" className="spark-icon">✦</span>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("supplier");
  const [view, setView] = useState<View>("overview");
  const [buyerView, setBuyerView] = useState<BuyerView>("dashboard");
  const [toast, setToast] = useState<Toast>(null);
  const [subleaseEnabled, setSubleaseEnabled] = useState(true);
  const [tokenStep, setTokenStep] = useState<WorkflowStep>(1);
  const [leaseStep, setLeaseStep] = useState<WorkflowStep>(1);
  const [tokenVerification, setTokenVerification] = useState<"idle" | "running" | "complete">("idle");
  const [leaseVerification, setLeaseVerification] = useState<"idle" | "running" | "complete">("idle");
  const [tokenAmount, setTokenAmount] = useState("48,000");
  const [leaseLength, setLeaseLength] = useState("30 days");
  const [tokenIssuance, setTokenIssuance] = useState<TokenIssuance>({ status: "idle" });

  const activeLabel = useMemo(
    () => role === "buyer"
      ? buyerNavigation.find((item) => item.id === buyerView)?.label ?? "Dashboard"
      : navigation.find((item) => item.id === view)?.label ?? "Overview",
    [buyerView, role, view],
  );

  const openView = (target: View) => {
    setView(target);
    setToast(null);
  };

  const showToast = (title: string, detail: string) => {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 4200);
  };

  const switchRole = () => {
    const nextRole = role === "buyer" ? "supplier" : "buyer";
    setRole(nextRole);
    setToast(null);
  };

  const runVerification = (workflow: Workflow) => {
    const setState = workflow === "token" ? setTokenVerification : setLeaseVerification;
    setState("running");
    window.setTimeout(() => {
      setState("complete");
      showToast("Verification complete", workflow === "token" ? "This B200 capacity can now be tokenized." : "This B200 capacity is ready for a lease offer.");
    }, 1100);
  };

  const issueTokenBatch = async () => {
    const hours = Number(tokenAmount.replaceAll(",", "").trim());

    if (!Number.isInteger(hours) || hours < 1) {
      const message = "Enter a whole number of B200 hours before approving issuance.";
      setTokenIssuance({ status: "failed", message });
      showToast("Check the token hours", message);
      return;
    }

    setTokenIssuance({ status: "issuing" });

    try {
      const response = await fetch("/api/tokenized-compute/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hours,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = await response.json() as DevnetReceipt & { error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "The Devnet issuance could not be completed.");
      }

      setTokenIssuance({ status: "confirmed", receipt: payload });
      showToast("B200H issued on Devnet", `${payload.amount.toLocaleString()} B200 Hour Tokens are now in Compute Exchange inventory.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Devnet issuance could not be completed.";
      setTokenIssuance({ status: "failed", message });
      showToast("Devnet issuance could not complete", message);
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label={`${role === "buyer" ? "Buyer" : "Supplier"} navigation`}>
        <button className="brand" onClick={() => role === "buyer" ? setBuyerView("dashboard") : openView("overview")} aria-label="Go to overview">
          <span className="brand-mark">CE</span>
          <span className="brand-copy">
            <strong>Compute Exchange</strong>
            <small>{role === "buyer" ? "Buyer Workspace" : "Supplier Console"}</small>
          </span>
        </button>

        <div className="supplier-card account-card">
          <span className="supplier-avatar">{role === "buyer" ? "A" : "N"}</span>
          <span>
            <strong>{role === "buyer" ? "Atlas Research" : "Northstar Data"}</strong>
            <small><i className="live-dot" /> {role === "buyer" ? "Buyer active" : "Verified supplier"}</small>
          </span>
          <button className="account-switch" onClick={switchRole} aria-label={`Switch to ${role === "buyer" ? "supplier" : "buyer"} workspace`}>⇄</button>
        </div>

        <nav className="side-nav">
          <p>{role === "buyer" ? "BUYER" : "SUPPLIER"}</p>
          {role === "buyer" ? buyerNavigation.map((item) => (
            <button key={item.id} className={buyerView === item.id ? "nav-item active" : "nav-item"} onClick={() => setBuyerView(item.id)} aria-current={buyerView === item.id ? "page" : undefined}>
              <span className="nav-glyph">{item.short}</span>{item.label}
            </button>
          )) : navigation.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => openView(item.id)} aria-current={view === item.id ? "page" : undefined}>
              <span className="nav-glyph">{item.short}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="support-card">
            <span className="support-icon">?</span>
            <div>
              <strong>{role === "buyer" ? "Planning a large run?" : "Need a hand?"}</strong>
              <p>{role === "buyer" ? "Talk to compute solutions." : "Our supplier team is here."}</p>
            </div>
          </div>
          <button className="text-button" onClick={() => showToast("Support request opened", `A ${role} specialist will contact you shortly.`)}>Contact support <Arrow /></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>{role === "buyer" ? "Buyer" : "Supplier"}</span><Arrow /><strong>{activeLabel}</strong></div>
          <div className="topbar-actions">
            <button className="role-switch" onClick={switchRole}>Switch to {role === "buyer" ? "Supplier" : "Buyer"}</button>
            <span className="status-pill"><i className="live-dot" /> All systems operational</span>
            <button className="profile-button" onClick={() => showToast("Account", role === "buyer" ? "Atlas Research · Buyer workspace" : "Northstar Data Center · Singapore")}>{role === "buyer" ? "AR" : "ND"}<span>⌄</span></button>
          </div>
        </header>

        <div className="page-content">
          {role === "buyer" ? <BuyerWorkspace view={buyerView} onNavigate={setBuyerView} onToast={showToast} /> : <>
            {view === "overview" && <Overview onNavigate={openView} onToast={showToast} />}
            {view === "revenue" && <Revenue onNavigate={openView} onToast={showToast} />}
            {view === "exchange" && <Exchange onNavigate={openView} />}
            {view === "tokens" && <Tokens step={tokenStep} setStep={setTokenStep} verification={tokenVerification} onRunVerification={() => runVerification("token")} amount={tokenAmount} setAmount={(value) => { setTokenAmount(value); setTokenIssuance({ status: "idle" }); }} issuance={tokenIssuance} onIssue={issueTokenBatch} onToast={showToast} />}
            {view === "leases" && <Leases step={leaseStep} setStep={setLeaseStep} verification={leaseVerification} onRunVerification={() => runVerification("lease")} length={leaseLength} setLength={setLeaseLength} subleaseEnabled={subleaseEnabled} setSubleaseEnabled={setSubleaseEnabled} onToast={showToast} />}
          </>}
        </div>
      </section>

      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon"><CheckIcon /></span>
          <div><strong>{toast.title}</strong><p>{toast.detail}</p></div>
          <button onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
        </div>
      )}
    </main>
  );
}

type PaymentRail = "USD" | "USDC" | "TOKEN";
type TransferMode = "share" | "full";
type StakeTerm = "30" | "90" | "180";

const gpuOptions = [
  { id: "B200", name: "NVIDIA B200", count: "x8–x64", price: 3.82, vram: "180 GB", region: "Singapore", badge: "Best for training" },
  { id: "H200", name: "NVIDIA H200", count: "x8–x32", price: 2.94, vram: "141 GB", region: "Tokyo", badge: "High memory" },
  { id: "H100", name: "NVIDIA H100", count: "x1–x64", price: 2.48, vram: "80 GB", region: "Singapore", badge: "Most available" },
];

function BuyerWorkspace({ view, onNavigate, onToast }: { view: BuyerView; onNavigate: (view: BuyerView) => void; onToast: (title: string, detail: string) => void }) {
  const [gpu, setGpu] = useState("B200");
  const [gpuCount, setGpuCount] = useState(16);
  const [duration, setDuration] = useState(14);
  const [payment, setPayment] = useState<PaymentRail>("TOKEN");
  const [transferMode, setTransferMode] = useState<TransferMode>("share");
  const [selectedContract, setSelectedContract] = useState("CTR-2048");
  const [bidHours, setBidHours] = useState("5,000");
  const [bidPrice, setBidPrice] = useState("3.18");
  const [auctionSubmitted, setAuctionSubmitted] = useState(false);
  const [marketSide, setMarketSide] = useState<"buy" | "sell">("buy");
  const [marketAmount, setMarketAmount] = useState("1,000");
  const [stakeAmount, setStakeAmount] = useState("4,000");
  const [stakeTerm, setStakeTerm] = useState<StakeTerm>("90");
  const [stakeLocked, setStakeLocked] = useState(false);

  if (view === "dashboard") return <BuyerDashboard onNavigate={onNavigate} />;
  if (view === "compute") return <ComputeExchange gpu={gpu} setGpu={setGpu} gpuCount={gpuCount} setGpuCount={setGpuCount} duration={duration} setDuration={setDuration} payment={payment} setPayment={setPayment} onToast={onToast} />;
  if (view === "contracts") return <ContractTransfer mode={transferMode} setMode={setTransferMode} selectedContract={selectedContract} setSelectedContract={setSelectedContract} onToast={onToast} />;
  if (view === "auctions") return <TokenAuctions bidHours={bidHours} setBidHours={setBidHours} bidPrice={bidPrice} setBidPrice={setBidPrice} submitted={auctionSubmitted} onSubmit={() => { setAuctionSubmitted(true); onToast("Bid submitted", "Your 5,000-token limit bid is now active in auction B200-012."); }} />;
  return <TokenMarket side={marketSide} setSide={setMarketSide} amount={marketAmount} setAmount={setMarketAmount} stakeAmount={stakeAmount} setStakeAmount={setStakeAmount} stakeTerm={stakeTerm} setStakeTerm={setStakeTerm} stakeLocked={stakeLocked} onStake={() => { setStakeLocked(true); onToast("Compute Tokens locked", `${stakeAmount} B200-H is now earning a share of verified sublease revenue at 40% APY.`); }} onToast={onToast} />;
}

function BuyerDashboard({ onNavigate }: { onNavigate: (view: BuyerView) => void }) {
  const routes: { id: BuyerView; label: string; title: string; body: string; meta: string; tone: string }[] = [
    { id: "compute", label: "DIRECT PURCHASE", title: "Deploy compute now", body: "Choose a verified GPU cluster and start a workload with USD, USDC, or Compute Tokens.", meta: "42 clusters available", tone: "blue" },
    { id: "contracts", label: "SECONDARY TRANSFER", title: "Use, share, or transfer", body: "See the time left on every contract. Sublease spare GPUs or transfer the remaining term.", meta: "2 active contracts", tone: "teal" },
    { id: "auctions", label: "COMPUTE AUCTIONS", title: "Bid on Compute Token Auction", body: "Join supplier auctions and track minted supply, clearing price, and your final allocation.", meta: "1 auction clearing today", tone: "violet" },
    { id: "market", label: "COMPUTE MARKET", title: "Trade & Hedge", body: "Trade Compute Tokens on the order book or hedge the price of future GPU demand.", meta: "$1.8M 24h volume", tone: "cyan" },
  ];
  return (
    <>
      <SectionTitle eyebrow="BUYER WORKSPACE" title="Buy, trade, hedge compute in one hub" body="Deploy GPUs, manage contract time, participate in new compute token auction, or hedge compute inventory in one workspace." action={<button className="button primary" onClick={() => onNavigate("compute")}>Buy Compute <Arrow /></button>} />
      <section className="buyer-balance-strip">
        <div><span>Available balance</span><strong>$248,600</strong><small>USD + USDC</small></div>
        <div><span>Compute Tokens</span><strong>12,400h</strong><small>10,240h uncommitted</small></div>
        <div><span>Running compute</span><strong>24 GPUs</strong><small>2 active clusters</small></div>
        <div><span>Contract runway</span><strong>46 days</strong><small>Nearest expiry Sep 01</small></div>
      </section>
      <section className="buyer-route-grid" aria-label="Buyer actions">
        {routes.map((route) => <button key={route.id} className={`buyer-route buyer-${route.tone}`} onClick={() => onNavigate(route.id)}>
          <span className="buyer-route-label">{route.label}</span>
          <h2>{route.title}</h2><p>{route.body}</p><span className="buyer-route-meta"><i className="live-dot" /> {route.meta}</span><span className="buyer-route-link">Open <Arrow /></span>
        </button>)}
      </section>
      <section className="buyer-dashboard-lower">
        <div className="section-block buyer-attention">
          <div className="block-heading compact-heading"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Two decisions, no surprises</h2></div></div>
          <button onClick={() => onNavigate("contracts")}><span className="attention-icon">↗</span><div><strong>8 B200 GPUs become idle Aug 12–20</strong><p>Contract CTR-2048 · Share them to recover an estimated $4,880.</p></div><Arrow /></button>
          <button onClick={() => onNavigate("auctions")}><span className="attention-icon violet-icon">◇</span><div><strong>Auction B200-012 clears in 02:14:09</strong><p>Your 5,000-token bid is currently 82% inside the estimated fill range.</p></div><Arrow /></button>
        </div>
        <div className="section-block buyer-portfolio">
          <div className="block-heading compact-heading"><div><p className="eyebrow">PORTFOLIO</p><h2>Compute under control</h2></div></div>
          <div className="portfolio-line"><span>Contracted GPU hours</span><strong>21,888h</strong></div>
          <div className="portfolio-line"><span>Redeemable token hours</span><strong>12,400h</strong></div>
          <div className="portfolio-line"><span>Open auction bids</span><strong>$15,900</strong></div>
          <div className="portfolio-progress"><span style={{ width: "68%" }} /></div><small>68% of August compute plan secured</small>
        </div>
      </section>
    </>
  );
}

function ComputeExchange({ gpu, setGpu, gpuCount, setGpuCount, duration, setDuration, payment, setPayment, onToast }: { gpu: string; setGpu: (value: string) => void; gpuCount: number; setGpuCount: (value: number) => void; duration: number; setDuration: (value: number) => void; payment: PaymentRail; setPayment: (value: PaymentRail) => void; onToast: (title: string, detail: string) => void }) {
  const selected = gpuOptions.find((option) => option.id === gpu) ?? gpuOptions[0];
  const hours = gpuCount * 24 * duration;
  const computeCost = hours * selected.price;
  const storageCost = gpuCount * duration * 6;
  const tokenBalance = 12400;
  const tokenEligible = gpu === "B200";
  return (
    <>
      <SectionTitle eyebrow="DIRECT PURCHASE · EXCHANGE" title="Deploy a GPU cluster" body="Select production-ready capacity, configure it around your workload, then settle in USD, USDC, or redeem Compute Tokens." />
      <ol className="buyer-stepper"><li className="active"><span>1</span><div><small>STEP 1</small><strong>Select capacity</strong></div></li><li className="active"><span>2</span><div><small>STEP 2</small><strong>Configure cluster</strong></div></li><li><span>3</span><div><small>STEP 3</small><strong>Review & pay</strong></div></li></ol>
      <div className="compute-layout">
        <div className="compute-main">
          <section className="section-block processor-panel">
            <div className="block-heading"><div><p className="eyebrow">AVAILABLE CAPACITY</p><h2>Select your processor</h2><p>Verified clusters with networking and storage ready to configure.</p></div><div className="filter-row"><button className="filter-chip active">All regions</button><button className="filter-chip">Training</button><button className="filter-chip">Available now</button></div></div>
            <div className="gpu-card-grid">
              {gpuOptions.map((option) => <button key={option.id} className={gpu === option.id ? "gpu-choice selected" : "gpu-choice"} onClick={() => setGpu(option.id)}>
                <span className="gpu-visual">{option.id}</span><span className="gpu-badge">{option.badge}</span><strong>{option.name}</strong><small>{option.count} · {option.region}</small>
                <div className="gpu-specs"><span><small>VRAM / GPU</small>{option.vram}</span><span><small>FROM</small>${option.price.toFixed(2)}/h</span></div>
              </button>)}
            </div>
          </section>
          <section className="section-block cluster-config">
            <div className="block-heading compact-heading"><div><p className="eyebrow">CLUSTER CONFIGURATION</p><h2>Shape it around the run</h2></div><span className="verified-pill"><CheckIcon /> Capacity held for 10:00</span></div>
            <div className="config-grid">
              <label>GPU count<select value={gpuCount} onChange={(event) => setGpuCount(Number(event.target.value))}><option value={8}>8 GPUs</option><option value={16}>16 GPUs</option><option value={32}>32 GPUs</option></select><small>InfiniBand fabric included</small></label>
              <label>Region<select defaultValue={selected.region}><option>{selected.region}</option><option>Tokyo</option><option>Finland</option></select><small>Estimated latency: 18ms</small></label>
              <label>Run length<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select><small>{hours.toLocaleString()} total GPU hours</small></label>
              <label>Storage<select defaultValue="2TB"><option value="2TB">2 TB NVMe / node</option><option value="4TB">4 TB NVMe / node</option><option value="10TB">10 TB shared NVMe</option></select><small>Persistent for the term</small></label>
              <label className="full-width">Environment<select defaultValue="pytorch"><option value="pytorch">PyTorch 2.7 · CUDA 12.8</option><option value="bare">Bare metal · Ubuntu 24.04</option><option value="k8s">Managed Kubernetes</option></select><small>SSH, API, and private registry access included</small></label>
            </div>
          </section>
        </div>
        <aside className="section-block checkout-card">
          <div className="checkout-heading"><div><p className="eyebrow">ORDER SUMMARY</p><h2>{gpuCount} × {selected.id}</h2><span>{selected.region} · {duration} days</span></div><span className="live-capacity"><i className="live-dot" /> Live</span></div>
          <div className="checkout-lines"><div><span>GPU compute</span><strong>${computeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div><div><span>NVMe storage</span><strong>${storageCost.toLocaleString()}</strong></div><div><span>Platform fee</span><strong>$0</strong></div></div>
          <div className="payment-heading"><strong>Choose settlement</strong><small>One order, three ways to pay</small></div>
          <div className="payment-rails" role="radiogroup" aria-label="Payment method">
            {(["USD", "USDC", "TOKEN"] as PaymentRail[]).map((rail) => <button key={rail} className={payment === rail ? "payment-rail selected" : "payment-rail"} onClick={() => setPayment(rail)} role="radio" aria-checked={payment === rail}><span className="payment-radio" /><div><strong>{rail === "TOKEN" ? "Compute Token" : rail}</strong><small>{rail === "USD" ? "Invoice or card" : rail === "USDC" ? "On-chain settlement" : "Redeem GPU hours"}</small></div>{rail === "TOKEN" && <span className="recommended">Best value</span>}</button>)}
          </div>
          {payment === "TOKEN" && <div className={tokenEligible && tokenBalance >= hours ? "token-redemption valid" : "token-redemption warning"}><div><span>Required</span><strong>{hours.toLocaleString()} {selected.id} tokens</strong></div><div><span>Wallet balance</span><strong>{tokenBalance.toLocaleString()}h</strong></div><p>{tokenEligible ? "Tokens cover base GPU compute. Storage settles separately in USDC." : `${selected.id} is not covered by your B200 Token balance. Choose USD or USDC.`}</p></div>}
          <div className="checkout-total"><span>{payment === "TOKEN" && tokenEligible ? "Token redemption" : "Total due"}</span><strong>{payment === "TOKEN" && tokenEligible ? `${hours.toLocaleString()}h + $${storageCost.toLocaleString()}` : `$${(computeCost + storageCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</strong><small>{payment === "TOKEN" && tokenEligible ? "B200 tokens + USDC storage" : `${payment} settlement`}</small></div>
          <button className="button primary checkout-button" onClick={() => onToast("Cluster order ready", `${gpuCount} ${selected.id} GPUs are reserved. Review and confirm the ${payment} settlement.`)} disabled={payment === "TOKEN" && (!tokenEligible || tokenBalance < hours)}>Review & deploy <Arrow /></button>
          <p className="checkout-note"><CheckIcon /> Capacity is verified before settlement. No token is burned until you confirm.</p>
        </aside>
      </div>
    </>
  );
}

function ContractTransfer({ mode, setMode, selectedContract, setSelectedContract, onToast }: { mode: TransferMode; setMode: (value: TransferMode) => void; selectedContract: string; setSelectedContract: (value: string) => void; onToast: (title: string, detail: string) => void }) {
  return (
    <>
      <SectionTitle eyebrow="SECONDARY TRANSFER" title="Turn unused contract time into value" body="Your rights stay visible by contract and expiry. Share spare GPUs while you keep the contract, or transfer the full remaining term to another buyer." />
      <div className="contract-layout">
        <section className="section-block owned-contracts">
          <div className="block-heading"><div><p className="eyebrow">YOUR ACTIVE CONTRACTS</p><h2>Choose the capacity you will not use</h2></div><span className="table-note">2 transferable</span></div>
          <button className={selectedContract === "CTR-2048" ? "contract-card selected" : "contract-card"} onClick={() => setSelectedContract("CTR-2048")}>
            <div className="contract-card-head"><span><small>CONTRACT CTR-2048</small><strong>32 × NVIDIA B200 · Singapore</strong></span><span className="contract-days"><strong>46</strong><small>days left</small></span></div>
            <div className="contract-timeline"><span style={{ width: "59%" }} /><i style={{ left: "42%", width: "21%" }}>idle Aug 12–20</i></div>
            <div className="contract-meta"><span><small>Term</small>Jul 01 – Sep 01</span><span><small>Current use</small>24 / 32 GPUs</span><span><small>Transfer rule</small>Share or full transfer</span></div>
          </button>
          <button className={selectedContract === "CTR-1972" ? "contract-card selected" : "contract-card"} onClick={() => setSelectedContract("CTR-1972")}>
            <div className="contract-card-head"><span><small>CONTRACT CTR-1972</small><strong>8 × NVIDIA H200 · Tokyo</strong></span><span className="contract-days amber-days"><strong>12</strong><small>days left</small></span></div>
            <div className="contract-timeline"><span style={{ width: "86%" }} /><i style={{ left: "70%", width: "24%" }}>idle now</i></div>
            <div className="contract-meta"><span><small>Term</small>Jun 15 – Jul 28</span><span><small>Current use</small>0 / 8 GPUs</span><span><small>Transfer rule</small>Full term only</span></div>
          </button>
          <div className="rights-explainer"><span>i</span><div><strong>You are transferring usage rights, not infrastructure.</strong><p>The original supplier still delivers the compute. The platform updates access, billing, and contract responsibility for the incoming buyer.</p></div></div>
        </section>
        <aside className="section-block transfer-builder">
          <p className="eyebrow">CREATE TRANSFER</p><h2>{selectedContract} · {selectedContract === "CTR-2048" ? "46 days remaining" : "12 days remaining"}</h2>
          <div className="transfer-mode-tabs"><button className={mode === "share" ? "active" : ""} onClick={() => setMode("share")}><span>↗</span><strong>Share capacity</strong><small>Keep the contract, sublease part</small></button><button className={mode === "full" ? "active" : ""} onClick={() => setMode("full")}><span>⇄</span><strong>Transfer contract</strong><small>Assign the full remaining term</small></button></div>
          {mode === "share" ? <div className="transfer-form"><label>Capacity to share<select defaultValue="8"><option value="8">8 of 32 B200 GPUs</option><option value="16">16 of 32 B200 GPUs</option><option value="24">24 of 32 B200 GPUs</option></select></label><div className="two-field"><label>Starts<input defaultValue="Aug 12, 2026" /></label><label>Ends<input defaultValue="Aug 20, 2026" /></label></div><label>Ask price<input defaultValue="$3.18 / GPU hour" /></label></div> : <div className="transfer-form"><label>Assignment scope<input value="All remaining rights · 32 B200 GPUs" readOnly /></label><label>Effective date<input defaultValue="Aug 01, 2026" /></label><label>Ask price<input defaultValue="$72,400 total" /></label></div>}
          <div className="recovery-card"><span>Estimated recovery</span><strong>{mode === "share" ? "$4,884" : "$72,400"}</strong><small>{mode === "share" ? "8 GPUs × 192 hours × $3.18" : "Full remaining contract after platform fee"}</small></div>
          <button className="button primary checkout-button" onClick={() => onToast(mode === "share" ? "Sublease listed" : "Contract transfer listed", mode === "share" ? "8 B200 GPUs are now available Aug 12–20. You retain the main contract." : "The full remaining contract is now open to approved buyers.")}>{mode === "share" ? "List shared capacity" : "List remaining contract"} <Arrow /></button>
          <p className="checkout-note"><CheckIcon /> Escrow activates only after another buyer accepts.</p>
        </aside>
      </div>
    </>
  );
}

function TokenAuctions({ bidHours, setBidHours, bidPrice, setBidPrice, submitted, onSubmit }: { bidHours: string; setBidHours: (value: string) => void; bidPrice: string; setBidPrice: (value: string) => void; submitted: boolean; onSubmit: () => void }) {
  return (
    <>
      <SectionTitle eyebrow="COMPUTE AUCTIONS" title="Bid on newly tokenized GPU supply" body="Suppliers mint tokens against verified GPU capacity. You set a maximum price; clearing determines how many tokens you actually receive." />
      <div className="auction-layout">
        <section className="section-block live-auction">
          <div className="auction-title"><div><span className="live-auction-pill"><i className="live-dot" /> LIVE</span><h2>B200 Hour Token · Batch 012</h2><p>Backed by 64 NVIDIA B200 GPUs · Singapore · Aug–Sep 2026</p></div><div className="auction-clock"><small>CLEARING IN</small><strong>02:14:09</strong></div></div>
          <div className="auction-metrics"><div><span>Will be minted</span><strong>48,000</strong><small>B200 hour tokens</small></div><div><span>Current demand</span><strong>67,920</strong><small>142% subscribed</small></div><div><span>Clearing estimate</span><strong>$3.12</strong><small>$2.96–$3.20 range</small></div></div>
          <div className="auction-book"><div className="auction-book-head"><strong>Demand by bid price</strong><span>Indicative, not final</span></div>{[["$3.32", "8,200", "100%"], ["$3.20", "16,400", "82%"], ["$3.12", "25,700", "58%"], ["$3.04", "12,800", "31%"], ["$2.96", "4,820", "14%"]].map((row) => <div className="auction-depth" key={row[0]}><strong>{row[0]}</strong><div><span style={{ width: row[2] }} /></div><span>{row[1]}h</span></div>)}</div>
          <div className="capacity-proof"><span className="proof-icon">✓</span><div><strong>Capacity proof verified</strong><p>48,000 token hours are covered by supplier capacity and delivery collateral before mint.</p></div><button>View proof</button></div>
        </section>
        <aside className="section-block bid-ticket">
          <div className="block-heading compact-heading"><div><p className="eyebrow">YOUR BID</p><h2>Set your limit</h2></div><span className={submitted ? "verified-pill" : "draft-pill"}>{submitted ? "Bid active" : "Draft"}</span></div>
          <label>Token amount<input value={bidHours} onChange={(event) => setBidHours(event.target.value)} /></label><label>Maximum price<input value={bidPrice} onChange={(event) => setBidPrice(event.target.value)} /><small>USDC per B200 token hour</small></label>
          <div className="bid-estimate"><div><span>Max commitment</span><strong>$15,900 USDC</strong></div><div><span>Estimated allocation</span><strong>3,900–5,000 tokens</strong></div><div><span>If outbid</span><strong>Funds released after clearing</strong></div></div>
          <button className="button primary checkout-button" onClick={onSubmit}>{submitted ? "Update bid" : "Submit bid"} <Arrow /></button><p className="checkout-note">Uniform clearing: you pay the final clearing price, never above your limit.</p>
        </aside>
      </div>
      <section className="section-block allocation-section">
        <div className="block-heading"><div><p className="eyebrow">MY CLEARED ALLOCATIONS</p><h2>From mint to tokens in your wallet</h2></div><span className="verified-pill"><CheckIcon /> Settled Jul 08</span></div>
        <div className="allocation-flow"><div><small>ACTUAL MINT</small><strong>40,000</strong><span>Total tokens created</span></div><Arrow /><div><small>ACTUAL SALE</small><strong>36,480</strong><span>91.2% placed at $3.06</span></div><Arrow /><div className="allocation-yours"><small>YOUR FINAL ALLOCATION</small><strong>3,840</strong><span>of 5,000 requested</span></div><Arrow /><div><small>WALLET STATUS</small><strong>Available</strong><span>Trade or redeem now</span></div></div>
      </section>
    </>
  );
}

function TokenPriceChart({ timeframe }: { timeframe: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const series: Record<string, number[]> = {
      "1H": [3.08, 3.10, 3.09, 3.12, 3.11, 3.14, 3.13, 3.15, 3.14, 3.18, 3.16, 3.17],
      "1D": [2.98, 3.01, 3.00, 3.04, 3.02, 3.07, 3.05, 3.11, 3.09, 3.14, 3.12, 3.18, 3.15, 3.20, 3.18, 3.22, 3.19, 3.24, 3.21, 3.17],
      "1W": [2.72, 2.76, 2.81, 2.78, 2.86, 2.91, 2.88, 2.96, 2.94, 3.03, 3.08, 3.04, 3.12, 3.09, 3.18, 3.14, 3.20, 3.17],
      "1M": [2.42, 2.51, 2.48, 2.60, 2.57, 2.68, 2.73, 2.69, 2.82, 2.90, 2.86, 2.98, 3.04, 3.00, 3.12, 3.08, 3.21, 3.17],
    };

    const draw = () => {
      const values = series[timeframe] ?? series["1D"];
      const width = Math.max(canvas.clientWidth, 320);
      const height = Math.max(canvas.clientHeight, 240);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, width, height);

      const plot = { left: 18, right: width - 62, top: 18, bottom: height - 34 };
      const min = Math.min(...values) - 0.04;
      const max = Math.max(...values) + 0.04;
      const x = (index: number) => plot.left + (index / (values.length - 1)) * (plot.right - plot.left);
      const y = (value: number) => plot.bottom - ((value - min) / (max - min)) * (plot.bottom - plot.top);

      context.lineWidth = 1;
      context.strokeStyle = "rgba(159, 178, 187, .11)";
      context.fillStyle = "#8792a4";
      context.font = "10px Arial";
      context.textAlign = "left";
      for (let index = 0; index < 5; index += 1) {
        const lineY = plot.top + index * ((plot.bottom - plot.top) / 4);
        context.beginPath();
        context.moveTo(plot.left, lineY);
        context.lineTo(plot.right, lineY);
        context.stroke();
        const label = (max - index * ((max - min) / 4)).toFixed(2);
        context.fillText(label, plot.right + 10, lineY + 3);
      }
      for (let index = 0; index < 6; index += 1) {
        const lineX = plot.left + index * ((plot.right - plot.left) / 5);
        context.beginPath();
        context.moveTo(lineX, plot.top);
        context.lineTo(lineX, plot.bottom);
        context.stroke();
      }

      const fill = context.createLinearGradient(0, plot.top, 0, plot.bottom);
      fill.addColorStop(0, "rgba(143, 91, 213, .22)");
      fill.addColorStop(0.72, "rgba(139, 124, 255, .08)");
      fill.addColorStop(1, "rgba(79, 214, 206, 0)");
      context.beginPath();
      values.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
      context.lineTo(plot.right, plot.bottom);
      context.lineTo(plot.left, plot.bottom);
      context.closePath();
      context.fillStyle = fill;
      context.fill();

      context.beginPath();
      values.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
      context.strokeStyle = "#7641b8";
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.stroke();

      const lastX = x(values.length - 1);
      const lastY = y(values[values.length - 1]);
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(plot.left, lastY);
      context.lineTo(plot.right, lastY);
      context.strokeStyle = "rgba(118, 65, 184, .45)";
      context.lineWidth = 1;
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.arc(lastX, lastY, 4, 0, Math.PI * 2);
      context.fillStyle = "#7641b8";
      context.fill();

      context.fillStyle = "#8792a4";
      context.font = "10px Arial";
      context.textAlign = "center";
      ["09:00", "12:00", "15:00", "18:00", "21:00"].forEach((label, index) => {
        const labelX = plot.left + index * ((plot.right - plot.left) / 4);
        context.fillText(label, labelX, height - 12);
      });
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [timeframe]);

  return <canvas ref={canvasRef} className="token-line-canvas" role="img" aria-label={`B200 Compute Token ${timeframe} price line chart`} />;
}

function TokenMarket({ side, setSide, amount, setAmount, stakeAmount, setStakeAmount, stakeTerm, setStakeTerm, stakeLocked, onStake, onToast }: { side: "buy" | "sell"; setSide: (value: "buy" | "sell") => void; amount: string; setAmount: (value: string) => void; stakeAmount: string; setStakeAmount: (value: string) => void; stakeTerm: StakeTerm; setStakeTerm: (value: StakeTerm) => void; stakeLocked: boolean; onStake: () => void; onToast: (title: string, detail: string) => void }) {
  const [timeframe, setTimeframe] = useState("1D");
  const asks = [["3.24", "2,400", "7,776"], ["3.21", "4,850", "15,568"], ["3.19", "1,920", "6,125"], ["3.18", "8,400", "26,712"]];
  const bids = [["3.16", "5,200", "16,432"], ["3.14", "3,600", "11,304"], ["3.12", "9,480", "29,578"], ["3.09", "2,100", "6,489"]];
  const availableToStake = 10_240;
  const stakeTokens = Math.max(0, Number(stakeAmount.replace(/,/g, "")) || 0);
  const stakeDays = Number(stakeTerm);
  const projectedRevenue = stakeTokens * 3.17 * 0.4 * (stakeDays / 365);
  const stakedBalance = stakeLocked ? stakeTokens : 0;
  const availableToTrade = Math.max(0, availableToStake - stakedBalance);
  const invalidStake = stakeTokens <= 0 || stakeTokens > availableToStake;
  return (
    <>
      <SectionTitle eyebrow="COMPUTE MARKET" title="Trade B200 Compute Tokens" body="Buy tokenized GPU hours before you need them, sell surplus inventory, or hold tokens for future compute redemption." />
      <section className="market-header section-block"><div className="market-pair"><span className="token-symbol">B2</span><div><strong>B200 Hour Token / USDC</strong><small>B200-HOUR · Redeemable compute</small></div></div><div className="market-stat positive"><span>Last price</span><strong>$3.17</strong><small>+4.28% today</small></div><div className="market-stat"><span>24h high</span><strong>$3.31</strong><small>Low $2.98</small></div><div className="market-stat"><span>24h volume</span><strong>$1.84M</strong><small>586,200 tokens</small></div><button className="button small" onClick={() => onToast("Redemption opened", "Your token balance is ready to configure as a B200 cluster.")}>Redeem for compute <Arrow /></button></section>
      <div className="market-layout">
        <section className="section-block market-chart-card">
          <div className="chart-toolbar"><div><button className="active">Price</button><button>Depth</button></div><div>{["1H", "1D", "1W", "1M"].map((period) => <button key={period} className={timeframe === period ? "active" : ""} onClick={() => setTimeframe(period)}>{period}</button>)}</div></div>
          <div className="price-chart"><TokenPriceChart timeframe={timeframe} /><span className="chart-price-tag">$3.17</span></div>
          <div className="chart-axis"><span>Jul 09</span><span>Jul 11</span><span>Jul 13</span><span>Jul 15</span></div>
        </section>
        <section className="section-block order-book">
          <div className="block-heading compact-heading"><div><p className="eyebrow">LIVE ORDER BOOK</p><h2>Market depth</h2></div><span className="live-capacity"><i className="live-dot" /> Live</span></div>
          <div className="book-head"><span>Price (USDC)</span><span>Amount</span><span>Total</span></div>{asks.map((row, index) => <div className="book-row ask-row" key={row[0]} style={{ backgroundSize: `${28 + index * 16}% 100%` }}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span></div>)}<div className="market-mid"><strong>$3.17</strong><span>≈ $3.17</span></div>{bids.map((row, index) => <div className="book-row bid-row" key={row[0]} style={{ backgroundSize: `${72 - index * 14}% 100%` }}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span></div>)}
        </section>
        <aside className="section-block trade-ticket">
          <div className="trade-side-tabs"><button className={side === "buy" ? "buy active" : ""} onClick={() => setSide("buy")}>Buy</button><button className={side === "sell" ? "sell active" : ""} onClick={() => setSide("sell")}>Sell</button></div>
          <div className="order-type-tabs"><button className="active">Limit</button><button>Market</button></div>
          <label>Limit price<div className="input-suffix"><input defaultValue="3.17" /><span>USDC</span></div></label><label>Amount<div className="input-suffix"><input value={amount} onChange={(event) => setAmount(event.target.value)} /><span>B200-H</span></div></label>
          <div className="quick-percent"><button onClick={() => setAmount("500")}>25%</button><button onClick={() => setAmount("1,000")}>50%</button><button onClick={() => setAmount("1,500")}>75%</button><button onClick={() => setAmount(side === "sell" ? "10,240" : "2,000")}>Max</button></div>
          <div className="trade-summary"><div><span>Available</span><strong>{side === "buy" ? "42,800 USDC" : "12,400 B200-H"}</strong></div><div><span>Order value</span><strong>$3,170.00</strong></div><div><span>Fee</span><strong>0.15%</strong></div></div>
          <button className={`button trade-button ${side}`} onClick={() => onToast(`${side === "buy" ? "Buy" : "Sell"} order placed`, `${amount} B200 Hour Tokens are now resting at $3.17.`)}>{side === "buy" ? "Buy B200-H" : "Sell B200-H"}</button>
          <p className="checkout-note"><CheckIcon /> Tokens remain redeemable for verified B200 compute after trade settlement.</p>
        </aside>
      </div>
      <section className={`section-block stake-vault ${stakeLocked ? "is-locked" : ""}`}>
        <div className="stake-story">
          <div className="block-heading"><div><p className="eyebrow">STAKE & EARN</p><h2>Lock Compute Tokens. Share sublease revenue.</h2></div><span className="stake-apy-pill">40% APY</span></div>
          <p className="stake-lead">Locked B200-H tokens represent compute capacity committed to the sublease pool. When that capacity is rented, you share the resulting income with the supplier.</p>
          <div className="stake-economics">
            <div><small>TARGET APY</small><strong>40.0%</strong><span>Funded by completed subleases</span></div>
            <div><small>PROJECTED {stakeTerm}-DAY SHARE</small><strong>${projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><span>Based on ${stakeTokens.toLocaleString()} B200-H</span></div>
            <div><small>REVENUE ALIGNMENT</small><strong>Buyer + Supplier</strong><span>Both earn when compute is used</span></div>
          </div>
          <div className="stake-flow" aria-label="Staking revenue flow"><span>Lock B200-H</span><Arrow /><span>Capacity enters sublease pool</span><Arrow /><span>Revenue shared with supplier</span></div>
        </div>
        <aside className="stake-ticket">
          <div className="stake-ticket-head"><div><p className="eyebrow">YOUR STAKE</p><h3>{stakeLocked ? "Stake active" : "Configure lock"}</h3></div><span className={stakeLocked ? "stake-status active" : "stake-status"}>{stakeLocked ? "Earning" : "Ready"}</span></div>
          <label>Amount to lock<div className="input-suffix"><input inputMode="numeric" value={stakeAmount} onChange={(event) => setStakeAmount(event.target.value)} disabled={stakeLocked} aria-label="B200 Hour Tokens to lock" /><span>B200-H</span></div></label>
          <div className="stake-quick"><button type="button" onClick={() => setStakeAmount("2,560")} disabled={stakeLocked}>25%</button><button type="button" onClick={() => setStakeAmount("5,120")} disabled={stakeLocked}>50%</button><button type="button" onClick={() => setStakeAmount("7,680")} disabled={stakeLocked}>75%</button><button type="button" onClick={() => setStakeAmount("10,240")} disabled={stakeLocked}>Max</button></div>
          <div className="stake-term"><span>Lock term</span><div role="group" aria-label="Stake lock term">{(["30", "90", "180"] as StakeTerm[]).map((term) => <button type="button" key={term} className={stakeTerm === term ? "active" : ""} onClick={() => setStakeTerm(term)} disabled={stakeLocked}>{term} days</button>)}</div></div>
          <div className="stake-summary"><div><span>Token value</span><strong>${(stakeTokens * 3.17).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div><div><span>Projected revenue share</span><strong>${projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div><div><span>Available after lock</span><strong>{Math.max(0, availableToStake - stakeTokens).toLocaleString()} B200-H</strong></div></div>
          <button className="button stake-button" onClick={onStake} disabled={invalidStake || stakeLocked}>{stakeLocked ? "Tokens locked · Earning 40% APY" : `Lock ${stakeTokens.toLocaleString()} B200-H`} {!stakeLocked && <Arrow />}</button>
          {invalidStake && !stakeLocked ? <p className="stake-warning">Enter an amount up to your 10,240 B200-H available balance.</p> : <p className="checkout-note"><CheckIcon /> Locked tokens cannot be traded or redeemed until the selected term ends.</p>}
        </aside>
      </section>
      <section className="section-block token-position"><div><p className="eyebrow">YOUR POSITION</p><h2>12,400 B200 Hour Tokens</h2><span>Average cost $2.91 · Unrealized P&L <strong>+$3,224</strong></span></div><div className="position-actions"><div><small>Available to trade</small><strong>{availableToTrade.toLocaleString()}h</strong></div><div><small>Committed to redemption</small><strong>2,160h</strong></div><div><small>Staked for revenue</small><strong>{stakedBalance.toLocaleString()}h</strong></div></div></section>
    </>
  );
}

function SectionTitle({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{body}</p>
      </div>
      {action}
    </div>
  );
}

function Overview({ onNavigate, onToast }: { onNavigate: (view: View) => void; onToast: (title: string, detail: string) => void }) {
  return (
    <>
      <SectionTitle
        eyebrow="GOOD AFTERNOON, NORTHSTAR"
        title="Your B200 capacity is ready to reach buyers."
        body="Use the Exchange to sell verified compute in the way that best fits your operation."
        action={<button className="button primary" onClick={() => onNavigate("exchange")}>Open Exchange <Arrow /></button>}
      />

      <div className="metric-grid">
        <Metric label="Delivered Hours" value="412,800" detail="Verified B200 GPU hours" tone="blue" />
        <Metric label="Hours awaiting use" value="126,000" detail="Purchased token hours not yet redeemed" tone="violet" />
        <Metric label="Total trade activity" value="$1.84M" detail="Token sales and lease contracts" tone="teal" />
      </div>

      <section className="section-block route-section">
        <div className="block-heading">
          <div><p className="eyebrow">THE EXCHANGE</p><h2>Sell compute in two clear ways</h2></div>
        </div>
        <div className="route-grid">
          <button className="route-card token-route" onClick={() => onNavigate("tokens")}>
            <span className="route-topline">TOKENIZED COMPUTE <Arrow /></span>
            <h3>Turn verified capacity into B200 Hour Tokens.</h3>
            <p>Sell standardized B200 GPU hours at auction and earn fees from platform trading volume. Buyers redeem tokens when they are ready to run.</p>
            <span className="route-cta">Issue B200 Hour Tokens <Arrow /></span>
          </button>
          <button className="route-card lease-route" onClick={() => onNavigate("leases")}>
            <span className="route-topline">LEASE COMPUTE <Arrow /></span>
            <h3>Sign a compute contract directly with a buyer.</h3>
            <p>Offer a specific B200 block for a clear term and price. Unused time can be offered for sublease if the contract allows it.</p>
            <span className="route-cta">Create a lease contract <Arrow /></span>
          </button>
        </div>
      </section>

      <section className="section-block flow-section">
        <div className="block-heading compact-heading">
          <div><p className="eyebrow">HOW IT WORKS</p><h2>One verified supply, two buyer paths</h2></div>
        </div>
        <div className="market-flow">
          <div className="flow-node source-node"><span className="flow-icon">▦</span><strong>Verified B200 capacity</strong><small>Your data center capacity is checked once.</small></div>
          <div className="flow-split" aria-hidden="true"><span></span><span></span></div>
          <div className="flow-branches">
            <div className="flow-node blue-node"><strong>Tokenized Compute</strong><small>Auction and platform trading</small></div>
            <div className="flow-node teal-node"><strong>Lease Compute</strong><small>Direct contract and optional sublease</small></div>
          </div>
          <div className="flow-merge" aria-hidden="true"><span></span><span></span></div>
          <div className="flow-node outcome-node"><span className="flow-icon">◎</span><strong>Buyer use & reporting</strong><small>Redeem with tokens or pay directly in USD / USDC.</small></div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="section-block next-steps">
          <div className="block-heading compact-heading"><div><p className="eyebrow">NEXT STEP</p><h2>One capacity block is ready</h2></div></div>
          <div className="ready-row"><span className="status-check"><CheckIcon /></span><div><strong>B200-SG-02 · 32 GPUs</strong><p>Verified, benchmarked, and ready to sell.</p></div><button className="button small" onClick={() => onNavigate("exchange")}>Choose a route</button></div>
        </div>
        <div className="section-block activity-card">
          <div className="block-heading compact-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Everything is on track</h2></div></div>
          <div className="activity-row"><i className="live-dot" /><span>Daily B200 health check passed</span><time>Today</time></div>
          <div className="activity-row"><i className="blue-dot" /><span>Token batch B200-004 was redeemed</span><time>Yesterday</time></div>
          <button className="text-button" onClick={() => onToast("Activity report ready", "Your last 30 days of supplier activity are ready to review.")}>View activity report <Arrow /></button>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`metric-card ${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span><i /></article>;
}

function Revenue({ onNavigate, onToast }: { onNavigate: (view: View) => void; onToast: (title: string, detail: string) => void }) {
  const monthlyRevenue = [
    { month: "Mar", lease: 44, tokenized: 10 },
    { month: "Apr", lease: 52, tokenized: 13 },
    { month: "May", lease: 48, tokenized: 18 },
    { month: "Jun", lease: 58, tokenized: 17 },
    { month: "Jul", lease: 63, tokenized: 22 },
    { month: "Aug", lease: 57, tokenized: 25 },
  ];

  return (
    <>
      <SectionTitle
        eyebrow="SUPPLIER REVENUE"
        title="See what your B200 capacity has earned."
        body="Track direct lease income and your share of revenue from Tokenized Compute in one simple view."
        action={<button className="button small" onClick={() => onToast("Revenue statement ready", "Your latest supplier revenue statement is ready to download.")}>Download statement <Arrow /></button>}
      />

      <section className="revenue-summary-grid" aria-label="Revenue summary">
        <article className="revenue-summary-card total"><span>All-time revenue</span><strong>$184,260</strong><small>Across leases and Tokenized Compute</small></article>
        <article className="revenue-summary-card"><span>This month</span><strong>$52,640</strong><small><i className="live-dot" /> 12.4% above last month</small></article>
        <article className="revenue-summary-card available"><span>Available now</span><strong>$42,860</strong><small>Ready for your next payout</small></article>
      </section>

      <section className="section-block revenue-sources">
        <div className="block-heading"><div><p className="eyebrow">REVENUE BY SOURCE</p><h2>Two clear ways your capacity earns</h2></div><p>Every amount is tied to a lease, an auction, or a platform fee share.</p></div>
        <div className="revenue-source-grid">
          <article className="revenue-source-card lease-income">
            <div className="revenue-source-top"><span className="mini-label teal-label">LEASE COMPUTE</span><span className="revenue-period">This month</span></div>
            <strong className="revenue-source-amount">$39,840</strong>
            <p>Direct lease income from dedicated B200 contracts.</p>
            <div className="source-stat"><span>Active lease contracts</span><strong>3</strong></div>
            <div className="source-stat"><span>Delivered lease hours</span><strong>11,072h</strong></div>
            <button className="text-button" onClick={() => onNavigate("leases")}>View lease contracts <Arrow /></button>
          </article>

          <article className="revenue-source-card token-income">
            <div className="revenue-source-top"><span className="mini-label blue-label">TOKENIZED COMPUTE</span><span className="revenue-period">This month</span></div>
            <strong className="revenue-source-amount">$12,800</strong>
            <p>Auction revenue and your share of B200H platform fees.</p>
            <div className="token-income-list">
              <div><span>Auction revenue</span><strong>$9,600</strong></div>
              <div><span>Trading fee share</span><strong>$2,400</strong></div>
              <div><span>Minting fee share</span><strong>$800</strong></div>
            </div>
            <button className="text-button" onClick={() => onNavigate("tokens")}>View Tokenized Compute <Arrow /></button>
          </article>
        </div>
      </section>

      <section className="revenue-detail-grid">
        <article className="section-block revenue-chart-card">
          <div className="block-heading compact-heading"><div><p className="eyebrow">MONTHLY REVENUE</p><h2>Monthly revenue overview</h2></div><div className="revenue-legend"><span><i className="lease-key" /> Lease Compute</span><span><i className="token-key" /> Tokenized Compute</span></div></div>
          <div className="revenue-chart" aria-label="Monthly revenue chart from March to August">
            <div className="revenue-chart-grid" aria-hidden="true"><span></span><span></span><span></span></div>
            <div className="revenue-bars">
              {monthlyRevenue.map((item) => <div className="revenue-bar-group" key={item.month}><div className="revenue-stack"><i className="revenue-lease-bar" style={{ height: `${item.lease}%` }} /><i className="revenue-token-bar" style={{ height: `${item.tokenized}%` }} /></div><span>{item.month}</span></div>)}
            </div>
          </div>
          <p className="revenue-chart-note">August includes $39,840 from direct leases and $12,800 from Tokenized Compute.</p>
        </article>

        <article className="section-block revenue-activity-card">
          <div className="block-heading compact-heading"><div><p className="eyebrow">RECENT REVENUE</p><h2>Latest earnings</h2></div></div>
          <div className="revenue-activity-row"><span className="revenue-activity-icon lease">↗</span><div><strong>Lease payment received</strong><p>CTR-SG-208 · 32 B200 GPUs</p></div><b>+$8,640</b></div>
          <div className="revenue-activity-row"><span className="revenue-activity-icon token">◇</span><div><strong>B200H auction settled</strong><p>Auction B200-012</p></div><b>+$9,600</b></div>
          <div className="revenue-activity-row"><span className="revenue-activity-icon token">%</span><div><strong>Trading fee share paid</strong><p>B200H marketplace activity</p></div><b>+$2,400</b></div>
          <div className="revenue-activity-row"><span className="revenue-activity-icon token">+</span><div><strong>Minting fee share paid</strong><p>Verified B200H issuance</p></div><b>+$800</b></div>
          <button className="text-button" onClick={() => onToast("Revenue history ready", "Your full revenue history is available in this demo.")}>View full revenue history <Arrow /></button>
        </article>
      </section>
    </>
  );
}

function Exchange({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <>
      <SectionTitle eyebrow="EXCHANGE" title="Choose how to sell your B200 capacity." body="Each option fits a different sales motion. You can use both, but never for the same capacity hours." />
      <div className="exchange-options">
        <article className="exchange-card lease-exchange">
          <div className="exchange-card-top"><span className="mini-label teal-label">DIRECT CONTRACTS</span></div>
          <h2>Lease Compute</h2>
          <p>Sell a dedicated B200 block directly to a buyer with a clear term, price, and access plan.</p>
          <ul className="feature-list"><li><CheckIcon /> Set the GPUs, contract term, and price</li><li><CheckIcon /> Buyers pay directly in USD or USDC</li><li><CheckIcon /> Offer unused time for sublease when permitted</li></ul>
          <button className="button dark" onClick={() => onNavigate("leases")}>Create lease contract <Arrow /></button>
        </article>
        <article className="exchange-card token-exchange">
          <div className="exchange-card-top"><span className="mini-label blue-label">STANDARDIZED HOURS</span></div>
          <h2>Tokenized Compute</h2>
          <p>Convert verified B200 capacity into standard B200 Hour Tokens to earn auction revenue and trading fees.</p>
          <ul className="feature-list"><li><CheckIcon /> One token represents one verified B200 GPU hour</li><li><CheckIcon /> Sell through auction and earn fees from trading volume</li><li><CheckIcon /> Buyers redeem tokens when ready to run</li></ul>
          <button className="button primary" onClick={() => onNavigate("tokens")}>Issue B200 Hour Tokens <Arrow /></button>
        </article>
      </div>
      <div className="clarity-banner"><span className="clarity-icon"><SparkIcon /></span><div><strong>Keep your capacity clear</strong><p>Once you begin a sale flow, the selected hours are reserved until the listing ends or the buyer contract is complete.</p></div></div>
    </>
  );
}

function ChecklistItem({ number, title, detail, status, active = false }: { number: string; title: string; detail: string; status: string; active?: boolean }) {
  const completed = status === "Complete";
  return <div className={`checklist-item ${active ? "focus" : ""}`}><span className={completed ? "step-number done" : "step-number"}>{completed ? "✓" : number}</span><div><strong>{title}</strong><p>{detail}</p></div><span className={completed ? "item-status complete" : status === "Running" ? "item-status running" : "item-status"}>{status}</span></div>;
}

function FlowStepper({ workflow, steps, step, setStep }: { workflow: Workflow; steps: string[]; step: WorkflowStep; setStep: (step: WorkflowStep) => void }) {
  return (
    <ol className={`workflow-steps ${workflow}`} aria-label={`${workflow} workflow progress`}>
      {steps.map((label, index) => {
        const position = (index + 1) as WorkflowStep;
        const complete = position < step;
        const active = position === step;
        return <li key={label} className={active ? "active" : complete ? "complete" : ""}><button type="button" onClick={() => complete && setStep(position)} disabled={!complete && !active} aria-current={active ? "step" : undefined}><span>{complete ? "✓" : `0${position}`}</span><div><small>STEP {position}</small><strong>{label}</strong></div></button></li>;
      })}
    </ol>
  );
}

function WorkflowSelection({ workflow, title, body, steps, step, setStep, onToast }: { workflow: Workflow; title: string; body: string; steps: string[]; step: WorkflowStep; setStep: (step: WorkflowStep) => void; onToast: (title: string, detail: string) => void }) {
  const isToken = workflow === "token";
  const selectedCapacity = isToken ? "B200-SG-01 · 64 B200 GPUs" : "B200-SG-02 · 32 B200 GPUs";
  return (
    <>
      <SectionTitle eyebrow={`${isToken ? "TOKENIZED COMPUTE" : "LEASE COMPUTE"} · STEP 1 OF 4`} title={title} body={body} />
      <FlowStepper workflow={workflow} steps={steps} step={step} setStep={setStep} />
      <div className="workflow-layout">
        <section className="section-block workflow-panel">
          <div className="block-heading compact-heading"><div><p className="eyebrow">AVAILABLE B200 CAPACITY</p><h2>Choose one capacity block</h2></div><span className="count-pill">2 available</span></div>
          <div className="capacity-options">
            <button className="capacity-option selected" type="button"><span className="capacity-radio" /><div><strong>{selectedCapacity}</strong><p>Singapore · Benchmark ready · {isToken ? "48,384" : "27,216"} hours available</p></div><span className="selected-label">Selected</span></button>
            <button className="capacity-option" type="button" onClick={() => onToast("Capacity selected", "This mock selection is ready for the next verification step.")}><span className="capacity-radio" /><div><strong>{isToken ? "B200-SG-02 · 32 B200 GPUs" : "B200-SG-01 · 64 B200 GPUs"}</strong><p>Singapore · Ready for review · alternate capacity block</p></div></button>
          </div>
          <div className="workflow-actions"><button className={isToken ? "button primary" : "button dark"} onClick={() => setStep(2)}>Continue to verification <Arrow /></button><button className="text-button" onClick={() => onToast("Capacity details", "GPU model, location, network, and health data are available in this demo.")}>View capacity details <Arrow /></button></div>
        </section>
        <aside className="section-block workflow-aside">
          <p className="eyebrow">WHAT HAPPENS NEXT</p><h2>{isToken ? "Verify before tokens are issued." : "Verify before the lease is offered."}</h2>
          <p className="lead">The selected B200 hours stay reserved while this sale flow is in progress.</p>
          <div className="workflow-callout"><span>01</span><div><strong>{isToken ? "Standardized for buyers" : "Ready to deliver"}</strong><p>{isToken ? "We confirm the hours can back standard B200 Hour Tokens." : "We confirm the contract can be delivered as described."}</p></div></div>
          <div className="workflow-callout"><span>02</span><div><strong>No double selling</strong><p>Reserved hours cannot be listed in the other selling option at the same time.</p></div></div>
        </aside>
      </div>
    </>
  );
}

function WorkflowVerification({ workflow, title, body, steps, step, setStep, verification, onRun }: { workflow: Workflow; title: string; body: string; steps: string[]; step: WorkflowStep; setStep: (step: WorkflowStep) => void; verification: "idle" | "running" | "complete"; onRun: () => void }) {
  const isToken = workflow === "token";
  const action = verification === "complete" ? <button className={isToken ? "button primary" : "button dark"} onClick={() => setStep(3)}>Continue to {isToken ? "sale terms" : "contract terms"} <Arrow /></button> : <button className={isToken ? "button primary" : "button dark"} disabled={verification === "running"} onClick={onRun}>{verification === "running" ? "Running verification…" : "Run verification"}</button>;
  return (
    <>
      <SectionTitle eyebrow={`${isToken ? "TOKENIZED COMPUTE" : "LEASE COMPUTE"} · STEP 2 OF 4`} title={title} body={body} action={action} />
      <FlowStepper workflow={workflow} steps={steps} step={step} setStep={setStep} />
      <div className="workflow-layout">
        <section className="section-block workflow-panel verification-panel">
          <div className="block-heading compact-heading"><div><p className="eyebrow">VERIFICATION CHECKLIST</p><h2>{isToken ? "Make these hours token-ready" : "Confirm this lease can be delivered"}</h2></div><span className={verification === "complete" ? "verified-pill" : "draft-pill"}>{verification === "complete" ? "Verified" : "Ready to run"}</span></div>
          <div className="checklist">
            <ChecklistItem number="1" title="B200 capacity details" detail="Confirm GPU serial ranges, location, and access method." status="Complete" />
            <ChecklistItem number="2" title="Benchmark and network test" detail="Confirm B200 performance, availability, and network readiness." status={verification === "complete" ? "Complete" : verification === "running" ? "Running" : "Ready"} active />
            <ChecklistItem number="3" title={isToken ? "Token delivery readiness" : "Lease delivery readiness"} detail={isToken ? "Confirm the hours can support buyer token redemption." : "Confirm buyer access and delivery expectations."} status={verification === "complete" ? "Complete" : "Next"} />
          </div>
          <div className="verification-footer"><span>{verification === "complete" ? <><CheckIcon /> Verification is complete. Your capacity is reserved for this sale flow.</> : "Run the check to unlock the next step."}</span>{verification === "complete" && <button className="text-button" onClick={() => setStep(1)}>Change capacity <Arrow /></button>}</div>
        </section>
        <aside className="section-block workflow-aside">
          <p className="eyebrow">WHY THIS MATTERS</p><h2>Buyers see exactly what they are getting.</h2>
          <p className="lead">We show only plain operating facts: hardware, location, performance, network, and availability.</p>
          <ul className="what-list"><li><span>01</span><div><strong>Clear offer</strong><p>{isToken ? "Each token is backed by eligible B200 capacity." : "Each contract names its B200 capacity and location."}</p></div></li><li><span>02</span><div><strong>Reliable delivery</strong><p>Buyers can see the readiness information before they commit.</p></div></li><li><span>03</span><div><strong>Simple monitoring</strong><p>Health information stays visible while the offer is live.</p></div></li></ul>
        </aside>
      </div>
    </>
  );
}

function PublishReview({ workflow, title, body, steps, step, setStep, amount, length, subleaseEnabled, issuance, onIssue, onToast }: { workflow: Workflow; title: string; body: string; steps: string[]; step: WorkflowStep; setStep: (step: WorkflowStep) => void; amount?: string; length?: string; subleaseEnabled?: boolean; issuance?: TokenIssuance; onIssue?: () => void; onToast: (title: string, detail: string) => void }) {
  const isToken = workflow === "token";
  const tokenIssued = issuance?.status === "confirmed";
  const issuing = issuance?.status === "issuing";
  return (
    <>
      <SectionTitle eyebrow={`${isToken ? "TOKENIZED COMPUTE" : "LEASE COMPUTE"} · STEP 4 OF 4`} title={title} body={body} />
      <FlowStepper workflow={workflow} steps={steps} step={step} setStep={setStep} />
      <div className="workflow-layout">
        <section className="section-block publish-review">
          <div className="block-heading compact-heading"><div><p className="eyebrow">FINAL REVIEW</p><h2>{isToken ? "B200 Hour Token batch" : "Dedicated B200 lease"}</h2></div><span className={isToken ? tokenIssued ? "verified-pill" : "draft-pill" : "teal-pill"}>{isToken ? tokenIssued ? "Issued on Devnet" : "Ready to issue" : "Buyer ready"}</span></div>
          <div className="review-lines">
            <div><span>Capacity</span><strong>{isToken ? "B200-SG-01 · 64 B200 GPUs" : "B200-SG-02 · 32 B200 GPUs"}</strong></div>
            <div><span>{isToken ? "Token hours" : "Lease term"}</span><strong>{isToken ? `${amount} B200 GPU hours` : length}</strong></div>
            <div><span>{isToken ? "Commercial model" : "Payment"}</span><strong>{isToken ? "Auction revenue + trading fees" : "Direct USD / USDC contract"}</strong></div>
            <div><span>{isToken ? "Buyer use" : "Sublease"}</span><strong>{isToken ? "Redeem eligible B200 compute" : subleaseEnabled ? "Allowed for approved buyers" : "Not allowed"}</strong></div>
          </div>
          {isToken && <div className="approval-note"><CheckIcon /><span>Approval records these verified hours on Solana Devnet. Compute Exchange signs the issuance; no supplier wallet is required.</span></div>}
          {isToken && issuance?.status === "failed" && <div className="issuance-error"><strong>Issuance needs attention</strong><span>{issuance.message}</span></div>}
          {isToken && tokenIssued && <DevnetReceiptCard receipt={issuance.receipt} />}
          <div className="workflow-actions"><button className={isToken ? "button primary" : "button dark"} disabled={isToken && (issuing || tokenIssued)} onClick={() => isToken ? onIssue?.() : onToast("Lease published", "Your direct B200 lease is now available to approved buyers.")}>{isToken ? tokenIssued ? "Issued on Devnet" : issuing ? "Issuing on Devnet…" : "Approve & issue B200H" : "Publish lease"} {!tokenIssued && !issuing && <Arrow />}</button><button className="text-button" onClick={() => setStep(3)}>Edit terms <Arrow /></button></div>
        </section>
        <aside className="section-block workflow-aside publish-aside">
          <p className="eyebrow">{isToken ? "AFTER ISSUANCE" : "AFTER YOU PUBLISH"}</p><h2>{isToken ? "A clear record, then an auction." : "Buyers can review the offer."}</h2>
          <div className="workflow-callout"><span>01</span><div><strong>{isToken ? "On-chain issuance receipt" : "Receive direct payment"}</strong><p>{isToken ? "The Devnet transaction records the B200H supply in Compute Exchange inventory." : "A buyer can agree to the clear contract terms."}</p></div></div>
          <div className="workflow-callout"><span>02</span><div><strong>{isToken ? "Auction revenue and trading fees" : "Track delivery"}</strong><p>{isToken ? "The batch can then be prepared for an auction without adding a wallet step for your team." : "Monitor the contract and delivery from the same console."}</p></div></div>
        </aside>
      </div>
    </>
  );
}

function DevnetReceiptCard({ receipt }: { receipt: DevnetReceipt }) {
  return <section className="devnet-receipt" aria-label="Solana Devnet issuance receipt">
    <div className="devnet-receipt-head"><span className="devnet-status"><i className="live-dot" /> Confirmed on Solana Devnet</span><span className="devnet-token">B200H</span></div>
    <strong>{receipt.amount.toLocaleString()} B200H issued</strong>
    <p>Issued to Compute Exchange inventory. The supplier approval is complete; no wallet action was required.</p>
    <div className="devnet-receipt-meta"><span>Mint <code>{shortAddress(receipt.mintAddress)}</code></span><span>Transaction <code>{shortAddress(receipt.signature)}</code></span></div>
    <a href={receipt.explorerUrl} target="_blank" rel="noreferrer">View Devnet proof <Arrow /></a>
  </section>;
}

function shortAddress(value: string) {
  return value.length > 16 ? `${value.slice(0, 7)}…${value.slice(-7)}` : value;
}

function Tokens({ step, setStep, verification, onRunVerification, amount, setAmount, issuance, onIssue, onToast }: { step: WorkflowStep; setStep: (step: WorkflowStep) => void; verification: "idle" | "running" | "complete"; onRunVerification: () => void; amount: string; setAmount: (value: string) => void; issuance: TokenIssuance; onIssue: () => void; onToast: (title: string, detail: string) => void }) {
  const steps = ["Select capacity", "Verify capacity", "Set sale terms", "Approve issuance"];
  const body = step === 1 ? "Start by selecting the B200 capacity you want to tokenize." : step === 2 ? "Verify this capacity before it becomes standard B200 Hour Tokens." : step === 3 ? "Set a simple auction offer and show how trading fees are earned." : "Review the batch, then approve its Devnet issuance.";
  if (step === 1) {
    return <WorkflowSelection workflow="token" title="Select B200 capacity." body={body} steps={steps} step={step} setStep={setStep} onToast={onToast} />;
  }
  if (step === 2) {
    return <WorkflowVerification workflow="token" title="Verify capacity for Tokenized Compute." body={body} steps={steps} step={step} setStep={setStep} verification={verification} onRun={onRunVerification} />;
  }
  if (step === 4) {
    return <PublishReview workflow="token" title="Review and approve issuance." body="Compute Exchange will issue the selected verified B200 hours to its Devnet inventory. You do not need a wallet." steps={steps} step={step} setStep={setStep} amount={amount} issuance={issuance} onIssue={onIssue} onToast={onToast} />;
  }
  return (
    <>
      <SectionTitle eyebrow="TOKENIZED COMPUTE · STEP 3 OF 4" title="Set your sale terms." body={body} action={<button className="button primary" onClick={() => setStep(4)}>Review issuance <Arrow /></button>} />
      <FlowStepper workflow="token" steps={steps} step={step} setStep={setStep} />
      <div className="issue-layout">
        <section className="section-block issue-form-card">
          <div className="block-heading compact-heading"><div><p className="eyebrow">TOKEN BATCH</p><h2>Create a simple offer</h2></div><span className="draft-pill">Draft</span></div>
          <div className="form-grid">
            <label>Capacity source<select defaultValue="B200-SG-01"><option>B200-SG-01 · 64 B200 GPUs</option><option>B200-SG-02 · 32 B200 GPUs</option></select></label>
            <label>Hours to tokenize<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" /></label>
            <label>Starting price<input defaultValue="$3.40 per B200 GPU hour" /></label>
            <label>Buyer access<select defaultValue="Open auction"><option>Open auction</option><option>Approved buyers only</option></select></label>
          </div>
          <div className="token-explainer"><span className="explainer-number">1</span><div><strong>One token = one B200 GPU hour</strong><p>Every token is backed by verified capacity. Buyers redeem it when they need to run.</p></div></div>
          <div className="issuance-steps"><div><span>01</span><strong>Create the batch</strong><p>Choose verified hours and a starting price.</p></div><div><span>02</span><strong>Sell to buyers</strong><p>Run an auction and earn fees from trading volume.</p></div><div><span>03</span><strong>Buyer redeems</strong><p>We match the buyer to eligible B200 compute.</p></div></div>
        </section>
        <aside className="section-block promise-card"><p className="eyebrow">WHAT YOU CAN EXPECT</p><h2>Clear throughout the sale.</h2><div className="promise-row"><span>01</span><div><strong>Before sale</strong><p>Set a simple starting price and buyer access.</p></div></div><div className="promise-row"><span>02</span><div><strong>After sale</strong><p>See which hours are sold and which are still available.</p></div></div><div className="promise-row"><span>03</span><div><strong>When used</strong><p>Delivery and buyer redemption are recorded in one place.</p></div></div><div className="promise-callout"><SparkIcon /> No specialist vocabulary. Just verified hours, buyers, and delivery.</div></aside>
      </div>
    </>
  );
}

function Leases({ step, setStep, verification, onRunVerification, length, setLength, subleaseEnabled, setSubleaseEnabled, onToast }: { step: WorkflowStep; setStep: (step: WorkflowStep) => void; verification: "idle" | "running" | "complete"; onRunVerification: () => void; length: string; setLength: (value: string) => void; subleaseEnabled: boolean; setSubleaseEnabled: (value: boolean) => void; onToast: (title: string, detail: string) => void }) {
  const steps = ["Select capacity", "Verify lease readiness", "Set contract terms", "Publish lease"];
  const body = step === 1 ? "Start by selecting the B200 capacity you want to lease." : step === 2 ? "Confirm delivery readiness so buyers know exactly what this contract can provide." : step === 3 ? "Set a clear contract term, price, access plan, and sublease preference." : "Review this direct lease before it is shown to buyers.";
  if (step === 1) {
    return <WorkflowSelection workflow="lease" title="Select B200 capacity." body={body} steps={steps} step={step} setStep={setStep} onToast={onToast} />;
  }
  if (step === 2) {
    return <WorkflowVerification workflow="lease" title="Verify lease readiness." body={body} steps={steps} step={step} setStep={setStep} verification={verification} onRun={onRunVerification} />;
  }
  if (step === 4) {
    return <PublishReview workflow="lease" title="Review your lease offer." body="Everything is ready for a final review before buyers can see the lease." steps={steps} step={step} setStep={setStep} length={length} subleaseEnabled={subleaseEnabled} onToast={onToast} />;
  }
  return (
    <>
      <SectionTitle eyebrow="LEASE COMPUTE · STEP 3 OF 4" title="Set your contract terms." body={body} action={<button className="button dark" onClick={() => setStep(4)}>Review & publish <Arrow /></button>} />
      <FlowStepper workflow="lease" steps={steps} step={step} setStep={setStep} />
      <div className="lease-layout">
        <section className="section-block lease-form-card">
          <div className="block-heading compact-heading"><div><p className="eyebrow">LEASE DETAILS</p><h2>Set the terms buyers will see</h2></div><span className="teal-pill">Direct contract</span></div>
          <div className="form-grid">
            <label>B200 capacity<select defaultValue="B200-SG-02"><option>B200-SG-02 · 32 B200 GPUs</option><option>B200-SG-01 · 64 B200 GPUs</option></select></label>
            <label>Lease term<select value={length} onChange={(event) => setLength(event.target.value)}><option>30 days</option><option>60 days</option><option>90 days</option></select></label>
            <label>Start date<input defaultValue="Aug 01, 2026" /></label>
            <label>Price<input defaultValue="$3.60 per B200 GPU hour" /></label>
            <label className="full-width">Buyer environment<select defaultValue="Dedicated project access"><option>Dedicated project access</option><option>Dedicated cluster access</option><option>Managed workload access</option></select></label>
          </div>
          <div className="sublease-control"><div><strong>Allow sublease</strong><p>Let a buyer offer unused time to another approved buyer. You keep delivery visibility.</p></div><button className={subleaseEnabled ? "toggle on" : "toggle"} onClick={() => setSubleaseEnabled(!subleaseEnabled)} aria-pressed={subleaseEnabled}><span /></button></div>
        </section>
        <aside className="section-block lease-summary"><p className="eyebrow">BUYER EXPERIENCE</p><h2>Direct, clear, and familiar.</h2><div className="summary-item"><span className="summary-icon">$</span><div><strong>Direct payment</strong><p>Buyers can settle in USD or USDC.</p></div></div><div className="summary-item"><span className="summary-icon">⌘</span><div><strong>Defined access</strong><p>The contract shows exactly how the buyer will use the B200 block.</p></div></div><div className="summary-item"><span className="summary-icon">↻</span><div><strong>{subleaseEnabled ? "Sublease enabled" : "No sublease"}</strong><p>{subleaseEnabled ? "Unused contract time may be offered to another approved buyer." : "Only the original buyer can use this capacity."}</p></div></div><div className="lease-note"><CheckIcon /> The platform tracks contract status and delivery in one place.</div></aside>
      </div>
      <section className="section-block lease-preview"><div><p className="eyebrow">CONTRACT PREVIEW</p><h2>Dedicated B200 capacity for {length}</h2><p>32 NVIDIA B200 GPUs · Singapore · Dedicated project access</p></div><span className="preview-price">$3.60 <small>/ GPU hour</small></span><span className="preview-status"><i className="live-dot" /> Ready to publish</span></section>
    </>
  );
}
