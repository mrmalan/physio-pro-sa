import { useContext } from "react";
import { DataContext, C, Card } from "../shared.js";

export const Finance = ({ navigate }) => (
  <div>
    <h2 style={{ margin: "0 0 1rem", color: C.teal }}>Finance</h2>
    <Card>
      <p style={{ color: C.textSub, margin: 0, fontSize: 14 }}>
        Finance dashboard — Xero/Sage exports, VAT201 workpaper, period selector. Coming in Day 2 build.
      </p>
    </Card>
  </div>
);
