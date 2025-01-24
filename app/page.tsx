import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const InvestmentSimulator = () => {
  const [dailyInvestment, setDailyInvestment] = useState(0);
  const [goal, setGoal] = useState(0);
  const [dailyReturnRate, setDailyReturnRate] = useState(0.01); // 1% default
  const [simulatedValues, setSimulatedValues] = useState([]);
  const [manualUpdates, setManualUpdates] = useState({});
  const [fixedData, setFixedData] = useState(false);

  useEffect(() => {
    simulateInvestments();
  }, [dailyInvestment, goal, dailyReturnRate]);

  const simulateInvestments = () => {
    const results = [];
    let currentInvestment = dailyInvestment;

    for (let day = 1; day <= 30; day++) {
      const previousDayValue = results[day - 2]?.value || 0;
      const projectedValue = previousDayValue + currentInvestment + previousDayValue * dailyReturnRate;
      const actualValue = manualUpdates[day] ?? projectedValue;

      results.push({ day, value: actualValue });
    }

    setSimulatedValues(results);
  };

  const handleManualUpdate = (day, value) => {
    setManualUpdates((prev) => ({ ...prev, [day]: value }));
  };

  const calculateDailyGoal = () => {
    const remainingGoal = goal - simulatedValues.reduce((sum, { value }) => sum + value, 0);
    const remainingDays = 30 - simulatedValues.length;
    return remainingDays > 0 ? remainingGoal / remainingDays : 0;
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Investment Simulator</h1>
      <Card className="mb-4">
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="daily-investment">Daily Investment ($)</Label>
            <Input
              id="daily-investment"
              type="number"
              value={dailyInvestment}
              onChange={(e) => setDailyInvestment(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="goal">Goal ($)</Label>
            <Input
              id="goal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="daily-return-rate">Daily Return Rate (%)</Label>
            <Input
              id="daily-return-rate"
              type="number"
              value={dailyReturnRate * 100}
              onChange={(e) => setDailyReturnRate(parseFloat(e.target.value) / 100 || 0)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={fixedData}
              onCheckedChange={(checked) => setFixedData(checked)}
              id="fixed-data"
            />
            <Label htmlFor="fixed-data">Keep Data Fixed</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-4">Projected Investments</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2">Day</th>
                <th className="border p-2">Projected Value ($)</th>
                <th className="border p-2">Manual Update ($)</th>
              </tr>
            </thead>
            <tbody>
              {simulatedValues.map(({ day, value }) => (
                <tr key={day}>
                  <td className="border p-2 text-center">{day}</td>
                  <td className="border p-2 text-center">{value.toFixed(2)}</td>
                  <td className="border p-2 text-center">
                    <Input
                      type="number"
                      value={manualUpdates[day] ?? ""}
                      onChange={(e) =>
                        handleManualUpdate(day, parseFloat(e.target.value) || 0)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <p>
              Daily Investment Needed to Meet Goal: ${calculateDailyGoal().toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentSimulator;
