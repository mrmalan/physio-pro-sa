import { useContext } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";

export const Invoices = ({ navigate }) => {
  const { patients } = useContext(DataContext);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Invoices</h2>
        <Btn>+ New invoice</Btn>
      </div>
      <Card>
        <p style={{ color: C.textSub, margin: 0, fontSize: 14 }}>
          Invoice register — coming in Day 2 build. Xero/Sage CSV exports included.
        </p>
      </Card>
    </div>
  );
};
