export default function VisualRefreshStyles() {
  return (
    <style>{`
      /* Warm Grocer visual layer. Kept at the end of the app tree so it can
         harmonise the legacy module styles without changing their behavior. */
      .app { display: block; width: 100%; min-height: 100vh; background: var(--paper); }
      .app button, .app input, .app select, .app textarea { font-family: 'DM Sans', 'Segoe UI', sans-serif !important; }
      .app h1, .app h2, .app h3, .app .stat-value, .app .procurement-summary-value, .app .summary-stat-card strong,
      .app .stock-level-num, .app .lot-total-stat strong, .app .lot-quantity, .app .drawer-state-label,
      .app .totals-row.big, .app .change-due strong, .app .product-tile-footer strong, .app .basket-line-total,
      .app .basket-grand-total strong, .app .variant-option-price, .app .reconcile-card strong, .app .ticket-row-total,
      .app .price-badge { font-family: 'Fraunces', Georgia, serif !important; }
      .sidebar {
        position: fixed; inset: 0 auto 0 0; z-index: 20; width: 264px; height: 100vh; overflow-y: auto; padding: 24px 16px 18px; gap: 30px;
        background: var(--green-deep); border-right: 1px solid rgba(255,255,255,.10);
      }
      .brand { gap: 7px; padding: 0 10px 24px; border-bottom: 1px solid rgba(140,203,234,.18); }
      .brand-lockup { display: flex; align-items: center; gap: 10px; }
      .brand-symbol {
        width: 30px; height: 30px; display: grid; place-items: center;
        border-radius: 9px 9px 9px 2px; background: #8CCBEA; color: var(--green-deep);
        font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 700;
      }
      .brand-mark { color: #F5FAFE; font-family: 'Fraunces', Georgia, serif; font-size: 24px; letter-spacing: -.03em; }
      .brand-sub { margin-left: 40px; color: #A9C6D9; font-size: 10px; letter-spacing: .08em; }
      .nav { gap: 18px; }
      .nav-group { display: flex; flex-direction: column; gap: 4px; }
      .nav-group-label {
        padding: 0 12px 6px; color: #8BBAD3; font-size: 10px; font-weight: 700;
        letter-spacing: .09em; text-transform: uppercase;
      }
      .nav-item {
        min-height: 44px; padding: 10px 13px; border-radius: 9px; gap: 11px;
        color: #D9E8F1; font-size: 13.5px; text-decoration: none; transition: background .16s ease, color .16s ease, transform .16s ease;
      }
      .nav-item span { flex: 1; }
      .nav-item.active { background: #E9F3F9; color: var(--green-deep); box-shadow: inset 4px 0 0 #8CCBEA; }
      .nav-item.active svg { color: var(--green); }
      a.nav-item:hover:not(.active) { background: rgba(255,255,255,.10); transform: translateX(2px); }
      .sidebar-footer { display: flex; flex-direction: column; gap: 12px; margin-top: auto; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.12); }
      .sidebar-account { display: flex; align-items: center; gap: 10px; }
      .sidebar-account .user-avatar { flex: 0 0 auto; width: 36px; height: 36px; background: #8CCBEA; color: var(--green-deep); }
      .sidebar-account-copy { display: flex; flex-direction: column; gap: 1px; min-width: 0; color: #F5FAFE; }
      .sidebar-account-copy strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
      .sidebar-account-copy small { overflow: hidden; color: #A9C6D9; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
      .sidebar-signout { width: 100%; justify-content: flex-start; min-height: 36px; padding: 8px 10px; border-color: rgba(140,203,234,.28); background: rgba(140,203,234,.07); color: #D9E8F1; box-shadow: none !important; }
      .sidebar-signout:hover { border-color: rgba(140,203,234,.56); background: rgba(140,203,234,.15); color: #F5FAFE; }
      .main { min-width: 0; width: calc(100% - 264px); margin-left: 264px; max-width: none; min-height: 100vh; padding: 22px clamp(20px, 4vw, 58px) 56px; }
      .topbar-anchor { display: flex; align-items: center; justify-content: flex-end; min-height: 46px; margin-bottom: 28px; gap: 12px; }
      .shell-context { display: flex; flex-direction: column; gap: 1px; margin-right: auto; }
      .context-kicker { color: var(--ink-faint); font-size: 10px; font-weight: 700; letter-spacing: .10em; text-transform: uppercase; }
      .context-date { color: var(--ink); font-size: 13px; font-weight: 600; }
      .user-chip { flex-direction: row; align-items: center; gap: 8px; text-align: left; }
      .user-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--green-soft); color: var(--green-deep); font-size: 14px; font-weight: 800; }
      .user-copy { display: flex; flex-direction: column; gap: 1px; }
      .user-copy strong { font-size: 12px; }
      .user-copy small { font-size: 10px; }
      .btn-quiet { background: transparent; border-color: transparent; color: var(--ink-soft); }
      .btn-quiet:hover { background: var(--surface); border-color: var(--hairline); }
      .page-title { font-family: 'Fraunces', Georgia, serif; font-size: clamp(30px, 3vw, 42px); font-weight: 600; letter-spacing: -.035em; line-height: 1.05; }
      .page-sub { max-width: 640px; margin-top: 8px; color: var(--ink-soft); font-size: 14px; }
      .panel { border-color: var(--hairline); border-radius: 11px; padding: 24px; box-shadow: none; }
      .panel-title { color: var(--green-deep); }
      .tag-card { border-radius: 4px 10px 10px 4px; padding: 15px 17px 15px 22px; margin-bottom: 9px; background: var(--surface-raised); box-shadow: none; }
      .tag-card::before { left: 8px; width: 5px; height: 5px; background: var(--paper-deep); }
      .btn { transition: background .16s ease, border-color .16s ease, color .16s ease; }
      .btn:hover:not(:disabled) { box-shadow: none; }
      .btn-primary { box-shadow: none; }
      .chip { padding: 4px 9px; }
      .msg { border: 1px solid transparent; border-radius: 10px; }
      .field input[type="text"], .field input[type="number"], .field input[type="date"], .field input[type="password"], .field select { min-height: 42px; }
      .tabs { gap: 20px; margin-bottom: 24px; border-bottom-color: var(--hairline); }
      .tab { margin-right: 0; padding: 11px 2px; font-family: 'DM Sans', 'Segoe UI', sans-serif; font-size: 13px; }

      /* Dashboard */
      .dashboard-kicker { margin-bottom: 8px; color: var(--green); font-size: 11px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
      .dashboard-heading { align-items: flex-end; margin-bottom: 30px; }
      .dashboard-heading .btn { min-width: 104px; justify-content: center; }
      .dashboard-actions { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 26px; padding: 7px; border: 1px solid var(--hairline); border-radius: 13px; background: var(--paper-deep); }
      .dashboard-action { min-height: 56px; padding: 10px 12px; border: 0; border-radius: 9px; background: transparent; }
      .dashboard-action:hover { background: var(--surface); border: 0; box-shadow: var(--shadow-sm); }
      .dashboard-action strong { font-size: 13px; }
      .dashboard-grid { gap: 14px; margin-bottom: 20px; }
      .dashboard-alert-strip { display: flex; align-items: center; gap: 12px; margin: -6px 0 20px; padding: 13px 15px; border: 1px solid #E4C58C; border-left: 4px solid #D99A35; background: #FFF8E8; color: var(--ink); }
      .dashboard-alert-icon { display: grid; place-items: center; color: var(--amber); }
      .dashboard-alert-strip div { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
      .dashboard-alert-strip strong { font-size: 13px; }
      .dashboard-alert-strip div span { color: var(--ink-soft); font-size: 12px; }
      .dashboard-alert-link { display: inline-flex; align-items: center; gap: 5px; color: var(--green-deep); font-size: 12px; font-weight: 800; text-decoration: none; white-space: nowrap; }
      .dashboard-alert-link:hover { text-decoration: underline; }
      .stat-card { min-height: 142px; padding: 20px; border-radius: 10px; box-shadow: none; }
      .stat-card.green { border-top: 0; border-left: 4px solid var(--green); }
      .stat-card.amber { border-top: 0; border-left: 4px solid #D99A35; }
      .stat-card.red { border-top: 0; border-left: 4px solid var(--red); }
      .stat-icon { background: var(--green-soft); color: var(--green-deep); }
      .stat-value { font-family: 'Fraunces', Georgia, serif; font-size: 36px; letter-spacing: -.04em; }
      .pulse-row { padding: 13px 14px; background: var(--paper); border-radius: 10px; }
      .activity-item { padding: 13px 0; }
      .dashboard-chart-panel .panel-title { margin-bottom: 18px; }
      .sales-chart-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .sales-chart-summary div { display: flex; flex-direction: column; gap: 3px; }
      .sales-chart-summary strong { color: var(--green-deep); font-family: 'Fraunces', Georgia, serif; font-size: 27px; letter-spacing: -.03em; }
      .sales-chart-summary span, .sales-chart-foot { color: var(--ink-faint); font-size: 11px; }
      .sales-chart-summary > svg { color: var(--green); }
      .sales-bars { display: flex; align-items: flex-end; gap: 10px; height: 164px; padding: 0 4px; border-bottom: 1px solid var(--hairline-strong); }
      .sales-bar-column { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; height: 100%; }
      .sales-bar-track { display: flex; align-items: flex-end; width: 100%; height: 135px; border-radius: 7px 7px 0 0; background: repeating-linear-gradient(to top, transparent 0, transparent 32px, var(--hairline) 33px, transparent 34px); }
      .sales-bar { display: block; width: min(30px, 72%); min-height: 2px; margin: 0 auto; border-radius: 6px 6px 0 0; background: linear-gradient(to top, var(--green-deep), var(--green)); transition: height .25s ease; }
      .sales-bar-column:hover .sales-bar { background: #5B9ACB; }
      .sales-bar-label { overflow: hidden; color: var(--ink-soft); font-size: 10px; font-weight: 700; text-overflow: ellipsis; text-transform: uppercase; }
      .sales-chart-foot { margin-top: 12px; }
      .readiness-chart { display: flex; flex-direction: column; gap: 20px; padding: 7px 0 5px; }
      .readiness-row { display: flex; flex-direction: column; gap: 7px; }
      .readiness-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
      .readiness-heading span { color: var(--ink-soft); font-size: 13px; }
      .readiness-heading strong { color: var(--green-deep); font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
      .readiness-track { height: 8px; overflow: hidden; border-radius: 999px; background: var(--paper-deep); }
      .readiness-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #8CCBEA, var(--green)); transition: width .3s ease; }
      .readiness-row small { color: var(--ink-faint); font-size: 11px; }

      /* POS: product workspace on the left, ticket/payment rail on the right. */
      .pos-layout { gap: 16px !important; }
      .pos-navigation { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px !important; padding: 6px; margin-bottom: 22px !important; border-radius: 12px; background: var(--paper-deep); }
      .pos-navigation-action { min-height: 62px; padding: 11px 14px !important; border: 0 !important; border-radius: 8px !important; background: transparent !important; }
      .pos-navigation-action:hover { border: 0 !important; background: rgba(255,255,255,.55) !important; }
      .pos-navigation-action.active { border: 0 !important; background: var(--surface-raised) !important; box-shadow: 0 2px 0 var(--green); }
      .pos-stepper { padding: 11px 15px !important; border-radius: 12px !important; background: var(--green-deep) !important; border-color: var(--green-deep) !important; }
      .pos-stepper-line { background: rgba(255,255,255,.25) !important; }
      .step { color: #B7D0BE !important; }
      .step.active { color: #FFF7E6 !important; }
      .step .step-circle { background: transparent !important; border-color: rgba(255,255,255,.30) !important; color: #D5E5D8 !important; }
      .step.active .step-circle, .step.done .step-circle { background: #8CCBEA !important; border-color: #8CCBEA !important; color: var(--green-deep) !important; }
      .pos-grid { grid-template-columns: minmax(320px, 380px) minmax(0, 1fr) !important; gap: 18px !important; }
      .pos-action-bar { grid-column: 1 / -1 !important; grid-row: 1 !important; padding: 8px !important; border-radius: 12px !important; background: var(--paper-deep) !important; border-color: var(--hairline) !important; }
      .pos-action-bar .btn { flex: 0 1 auto !important; min-height: 40px; }
      .pos-phone-status { grid-column: 1 / -1 !important; grid-row: 2 !important; }
      .pos-product-panel { grid-column: 2 !important; grid-row: 3 !important; }
      .pos-basket-panel { grid-column: 2 !important; grid-row: 4 !important; }
      .pos-payment-panel { grid-column: 1 !important; grid-row: 3 / span 2 !important; position: sticky !important; top: 18px !important; }
      .pos-grid:not(:has(.pos-product-panel)) .pos-basket-panel { grid-column: 2 !important; grid-row: 2 !important; }
      .pos-grid:not(:has(.pos-product-panel)) .pos-payment-panel { grid-column: 1 !important; grid-row: 2 !important; }
      .pos-grid:not(:has(.pos-product-panel)) .pos-basket-panel { min-height: 255px; }
      .pos-product-panel, .pos-basket-panel, .pos-payment-panel { min-width: 0; }
      .pos-product-panel .product-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; max-height: 575px !important; }
      .product-tile { min-height: 220px !important; border-radius: 8px !important; background: var(--surface-raised) !important; }
      .product-tile:hover:not(:disabled) { border-color: var(--green) !important; box-shadow: inset 0 0 0 1px var(--green) !important; }
      .product-image-frame { height: 116px !important; border-radius: 10px !important; background: var(--paper-deep) !important; }
      .product-tile-footer strong, .basket-line-total, .totals-row.big, .price-badge { font-family: 'Fraunces', Georgia, serif !important; }
      .basket-line { padding: 12px !important; border-radius: 10px !important; }
      .basket-grand-total { padding: 17px 12px !important; border-top: 2px solid var(--green-deep) !important; }
      .basket-grand-total strong { font-family: 'Fraunces', Georgia, serif !important; font-size: 24px !important; }
      .pos-payment-panel .panel-title { font-size: 20px; }
      .totals-card { padding: 17px !important; border-radius: 12px !important; background: var(--green-deep) !important; border-color: var(--green-deep) !important; color: #FFF8E9 !important; }
      .totals-card .totals-row { color: #C8DCCB !important; }
      .totals-card .totals-row.big { color: #FFF8E9 !important; border-top: 1px solid rgba(255,255,255,.20); padding-top: 12px; }
      .payment-option { min-height: 46px; border-radius: 10px !important; }
      .complete-btn { min-height: 50px !important; border-radius: 11px !important; font-family: 'DM Sans', 'Segoe UI', sans-serif !important; }
      .qty-btn { width: 32px !important; height: 32px !important; border-radius: 8px !important; }
      .scanner-input-wrap input { min-height: 46px; border-radius: 10px !important; border-color: var(--green) !important; }
      .empty-sale-state { min-height: 205px !important; padding: 28px 18px !important; border: 1px dashed var(--hairline-strong); border-radius: 10px; background: linear-gradient(135deg, #FFFDF7, var(--paper)); }
      .empty-sale-state svg { width: 42px; height: 42px; color: var(--green); stroke-width: 1.5; }

      /* Inventory, pricing, procurement, finance and admin surfaces. */
      .inventory-summary, .procurement-summary { gap: 10px !important; }
      .summary-stat-card, .procurement-summary-card { min-height: 76px; padding: 15px 17px !important; border-radius: 12px !important; box-shadow: none; }
      .summary-stat-card strong, .procurement-summary-value { font-family: 'Fraunces', Georgia, serif !important; }
      .inventory-actions, .pricing-actions { gap: 8px !important; margin-bottom: 22px !important; padding: 6px; border-radius: 13px !important; background: var(--paper-deep); }
      .inventory-action, .pricing-action { min-height: 54px; border: 0 !important; border-radius: 9px !important; background: transparent !important; }
      .inventory-action.active, .pricing-action.active { background: var(--surface-raised) !important; box-shadow: var(--shadow-sm); }
      .stock-card, .lot-card, .recent-item, .modal-picker-item { border-radius: 12px !important; }
      .stock-card:hover { border-color: var(--green); box-shadow: none; }
      .user-row { padding: 14px 0 !important; }

      /* Product family dialog: keep image selection direct and lightweight. */
      .modal-backdrop { background: rgba(18, 48, 75, .58); backdrop-filter: blur(5px); }
      .modal { width: min(100%, 620px); padding: 27px; border-color: #D9E1E5; border-radius: 18px; box-shadow: 0 24px 70px rgba(18, 48, 75, .22); }
      .modal-header { margin-bottom: 2px; }
      .modal-header .panel-title { margin-bottom: 20px; font-family: 'Fraunces', Georgia, serif; font-size: 24px; letter-spacing: -.025em; }
      .modal-header .panel-title > span > svg { color: var(--green); }
      .modal-header .btn-icon { width: 40px; height: 40px; border-radius: 11px; color: var(--ink-soft); }
      .modal-header .btn-icon:hover { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
      .modal:has(.product-form) { width: min(100%, 660px); }
      .product-form { display: flex; flex-direction: column; gap: 15px; }
      .product-form .field { margin-bottom: 0; }
      .product-form .field input[type="text"], .product-form .field input[type="number"], .product-form .field input[type="url"], .product-form .field select { min-height: 44px; border-radius: 9px; }
      .product-form .field input:focus, .product-form .field select:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(52,125,181,.14); }
      .product-basic-grid { display: grid; grid-template-columns: minmax(0, .75fr) minmax(0, 1.25fr); gap: 13px; }
      .product-settings-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) repeat(2, minmax(0, .85fr)); gap: 13px; }
      .product-image-source { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--hairline); border-radius: 12px; background: #FCFAF4; }
      .product-image-source .field { margin-bottom: 0; }
      .product-image-upload-field .family-upload-control { min-height: 52px; }
      .product-modal-actions { margin-top: 2px; padding-top: 16px; border-top: 1px solid var(--hairline); }
      .modal:has(.family-form) { width: min(100%, 520px); }
      .family-form { display: flex; flex-direction: column; gap: 16px; }
      .family-form .field { margin-bottom: 0; }
      .family-form .field input[type="text"] { min-height: 46px; border-radius: 10px; }
      .family-form .field input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(52,125,181,.14); }
      .family-name-field input { font-size: 15px; }
      .family-image-layout { padding: 14px; border: 1px solid var(--hairline); border-radius: 12px; background: #FCFAF4; }
      .family-image-fields { min-width: 0; }
      .family-upload-field { min-width: 0; }
      .family-upload-field .field-label { display: flex; justify-content: space-between; gap: 8px; }
      .family-upload-field .field-label em { color: var(--ink-faint); font-size: 10px; font-style: normal; font-weight: 500; letter-spacing: 0; text-transform: none; }
      .family-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .family-upload-control { display: flex; align-items: center; gap: 9px; min-height: 54px; padding: 9px 11px; border: 1px solid #AFC4D1; border-radius: 9px; background: #F4F9FB; color: var(--green-deep); cursor: pointer; transition: border-color .16s ease, background .16s ease; }
      .family-upload-control:hover { border-color: var(--green); background: var(--green-soft); }
      .family-upload-control:focus-within { outline: 3px solid rgba(52,125,181,.18); outline-offset: 2px; }
      .family-upload-icon { display: grid; place-items: center; flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; background: #D8EBF5; color: var(--green); }
      .family-upload-control > span:nth-child(2) { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .family-upload-control strong { font-size: 12px; }
      .family-upload-control small { overflow: hidden; color: var(--ink-faint); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
      .selected-file { display: flex; align-items: center; gap: 5px; max-width: 100%; margin-top: 7px; overflow: hidden; color: var(--green-deep); font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .selected-file svg { flex: 0 0 auto; color: var(--green); }
      .family-modal-actions { margin-top: 2px; padding-top: 16px; border-top: 1px solid var(--hairline); }
      .family-modal-actions .btn-primary { min-width: 142px; }

      @media (max-width: 1080px) {
        .pos-grid { grid-template-columns: 1fr !important; }
        .pos-product-panel, .pos-basket-panel, .pos-payment-panel, .pos-action-bar, .pos-phone-status { grid-column: 1 !important; grid-row: auto !important; }
        .pos-payment-panel { position: static !important; order: -1; }
      }
      @media (max-width: 760px) {
        .sidebar { width: 100%; height: auto; min-height: 0; position: static; padding: 14px 16px 10px; gap: 14px; }
        .app { display: block; }
        .brand { padding: 0; }
        .brand-sub, .sidebar-footnote, .nav-group-label { display: none; }
        .sidebar-footer { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 12px; margin-top: 0; padding-top: 10px; }
        .sidebar-account { min-width: 0; }
        .sidebar-signout { width: auto; }
        .nav { flex-direction: row; gap: 5px; overflow-x: auto; padding-bottom: 2px; }
        .nav-group { flex-direction: row; flex: 0 0 auto; gap: 5px; }
        .nav-item { min-height: 38px; padding: 8px 11px; white-space: nowrap; }
        .main { width: auto; margin-left: 0; min-height: 0; padding: 16px 14px 36px; }
        .topbar-anchor { flex-wrap: wrap; margin-bottom: 22px; }
        .shell-context { width: 100%; order: -2; }
        .user-copy { display: none; }
        .dashboard-heading { align-items: stretch; margin-bottom: 22px; }
        .dashboard-alert-strip { align-items: flex-start; }
        .dashboard-alert-link { margin-left: auto; }
        .dashboard-heading .btn { align-self: flex-start; }
        .dashboard-actions { grid-template-columns: 1fr 1fr !important; }
        .dashboard-grid { grid-template-columns: 1fr 1fr !important; }
        .dashboard-grid.two-up { grid-template-columns: 1fr !important; }
        .pos-stepper { overflow-x: auto; }
        .step { white-space: nowrap; }
        .pos-grid { gap: 12px !important; }
        .pos-action-bar .btn { flex: 1 1 140px !important; }
        .basket-line { grid-template-columns: minmax(0, 1fr) auto !important; gap: 8px !important; }
        .basket-line-total { grid-column: 2; grid-row: 1; }
        .basket-line-remove { grid-column: 2; grid-row: 2; justify-self: end; }
        .qty-stepper { grid-column: 1; grid-row: 2; justify-self: start; }
        .product-basic-grid, .product-settings-grid { grid-template-columns: 1fr; gap: 15px; }
      }
      @media (max-width: 480px) {
        .dashboard-grid, .dashboard-actions { grid-template-columns: 1fr !important; }
        .user-avatar { width: 32px; height: 32px; }
        .panel { padding: 18px !important; }
        .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .product-tile { min-height: 190px !important; padding: 7px !important; }
        .product-image-frame { height: 90px !important; }
        .product-tile-name { font-size: 12px !important; }
        .product-tile-footer strong { font-size: 12px !important; }
        .modal { padding: 21px !important; }
        .modal:has(.family-form) { padding: 21px !important; }
        .family-image-layout { padding: 12px; }
        .family-modal-actions { gap: 8px; }
        .family-modal-actions .btn { flex: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
      }
    `}</style>
  );
}
