const OpenAI = require('openai');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const AILog = require('../models/AILog');

const openai = new OpenAI({ apiKey: process.env.AI_API_KEY || 'sk-mock' });

// Function execution service ensuring strict user role scoping
async function executeTool(name, args, user) {
  if (name === 'get_headcount') {
    if (user.role === 'Employee') return { error: 'Access denied: Insufficient scope' };
    const count = await Employee.countDocuments({ status: 'active' });
    return { activeEmployees: count };
  }

  if (name === 'get_my_leave_balance') {
    const empId = user.employeeId;
    if (!empId) return { error: 'No employee profile associated.' };
    const leaves = await LeaveRequest.aggregate([
      { $match: { employeeId: empId, status: 'approved' } },
      { $group: { _id: '$leaveType', total: { $sum: '$daysCount' } } }
    ]);
    return { usedLeaves: leaves };
  }

  if (name === 'get_payroll_summary') {
    if (user.role === 'Employee') return { error: 'Refused: Cannot view colleagues or company salary' };
    const latest = await PayrollRun.findOne().sort({ createdAt: -1 });
    return latest || { message: 'No payroll runs executed yet' };
  }

  return { message: 'Tool not supported' };
}

exports.chat = async (req, res) => {
  const { message } = req.body;
  const user = req.user;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the HCM Lite AI Assistant. Guardrails:
          - Office start: 09:00, grace 15 min. Half day < 5h.
          - Leave quotas: Annual 14, Sick 8, Casual 10.
          - Overlap or over-balance returns 422.
          - If an employee asks for a colleague's salary, politely refuse.
          - User role: ${user.role}, User employeeId: ${user.employeeId}`
        },
        { role: 'user', content: message }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_headcount',
            description: 'Get total active headcount'
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_my_leave_balance',
            description: 'Get current leave balance for logged in employee'
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_payroll_summary',
            description: 'Get company payroll overview'
          }
        }
      ],
      tool_choice: 'auto'
    });

    const choice = response.choices[0].message;
    let finalAnswer = choice.content;
    let toolInvoked = null;

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      toolInvoked = toolCall.function.name;
      const toolResult = await executeTool(toolInvoked, JSON.parse(toolCall.function.arguments || '{}'), user);
      
      const followUp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are HCM Lite AI. Use provided tool results to answer.' },
          { role: 'user', content: message },
          choice,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          }
        ]
      });
      finalAnswer = followUp.choices[0].message.content;
    }

    await AILog.create({
      userEmail: user.email,
      role: user.role,
      prompt: message,
      toolInvoked,
      response: finalAnswer || ''
    });

    return res.json({ reply: finalAnswer, isAIGenerated: true });
  } catch (err) {
    return res.status(500).json({ error: 'AI Assistant unavailable or timed out.' });
  }
};

exports.smartLeaveExtract = async (req, res) => {
  const { sentence } = req.body;
  try {
    const prompt = `Extract leave details as JSON from this sentence: "${sentence}".
    Format: {"leaveType": "casual"|"sick"|"annual"|"unpaid", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string"}.
    Assume today is ${new Date().toISOString().split('T')[0]}. Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    });

    const parsed = JSON.parse(completion.choices[0].message.content.trim());
    return res.json(parsed);
  } catch (err) {
    return res.status(422).json({ error: 'Could not extract leave parameters from input' });
  }
};