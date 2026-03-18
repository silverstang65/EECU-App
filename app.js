let allCareers = [];

async function init() {
    if (document.getElementById('career-selection')) {
        await loadCareers();
    }
    if (document.getElementById('tax-calc')) {
        renderTaxPage();
    }
    if (document.getElementById('budget-page')) {
        setupBudget();
    }
    if (document.getElementById('results-page')) {
        renderResults();
    }
}

async function loadCareers() {
    try {
        let response = await fetch('https://eecu-data-server.vercel.app/data');
        allCareers = await response.json();
        displayCareers(allCareers);

        let searchInput = document.getElementById('search-careers');
        if (searchInput) {
            searchInput.oninput = function() {
                let term = searchInput.value.toLowerCase();
                let filtered = [];
                
                for (let i = 0; i < allCareers.length; i++) {
                    let career = allCareers[i];
                    let name = career.Occupation || career.occupation || "";
                    if (name.toLowerCase().includes(term)) {
                        filtered.push(career);
                    }
                }
                displayCareers(filtered);
            };
        }
    } catch (error) {
        console.log("Error loading careers");
    }
}

function displayCareers(list) {
    let container = document.getElementById('career-selection');
    if (!container) return;
    container.innerHTML = "";

    list.forEach(function(career) {
        let card = document.createElement('div');
        card.className = "career";
        
        let name = career.Occupation || career.occupation || "Name Missing";
        let salaryNum = career.Salary || career.annual_salary || 0;

        card.innerHTML = "<h3>" + name + "</h3><p>$" + Number(salaryNum).toLocaleString() + " / yr</p>";

        card.onclick = function() {
            localStorage.setItem('pickedCareer', JSON.stringify(career));
            
            let preview = document.querySelector('.selected-career p');
            if (preview) {
                preview.innerText = name + " - $" + Number(salaryNum).toLocaleString() + "/yr";
            }
            
            let allCards = document.querySelectorAll('.career');
            allCards.forEach(function(c) {
                c.style.backgroundColor = "";
            });
            card.style.backgroundColor = "#e1f0ff";
        };
        container.appendChild(card);
    });
}

function renderTaxPage() {
    let rawData = localStorage.getItem('pickedCareer');
    if (!rawData) return;

    let data = JSON.parse(rawData);
    let gross = Number(data.Salary || data.annual_salary || 0);
    
    let state = gross * 0.04;
    let ss = gross * 0.062;
    let med = gross * 0.0145;

    let bracket1 = 0;
    let bracket2 = 0;
    let bracket3 = 0;

    if (gross > 0) {
        bracket1 = Math.min(gross, 11600) * 0.10;
        
        if (gross > 11600) {
            bracket2 = (Math.min(gross, 47150) - 11600) * 0.12;
        }

        if (gross > 47150) {
            bracket3 = (gross - 47150) * 0.22;
        }
    }
    
    let fed = bracket1 + bracket2 + bracket3;
    let totalTaxes = fed + state + ss + med;
    let net = gross - totalTaxes;
    let monthly = net / 12;

    function updateText(id, val) {
        let el = document.getElementById(id);
        if (el) {
            el.innerText = "$" + Math.round(val).toLocaleString();
        }
    }

    updateText('gross-an', gross);
    updateText('total-taxes', totalTaxes);
    updateText('net-an', net);
    updateText('month-take', monthly);
    updateText('fedtax', fed);
    updateText('statetax', state);
    updateText('socialsec', ss);
    updateText('medicare', med);
    updateText('totaldeduc', totalTaxes);
    updateText('fed-b1', bracket1);
    updateText('fed-b2', bracket2);
    updateText('fed-b3', bracket3);

    localStorage.setItem('monthlyNet', monthly);
}

function setupBudget() {
    let monthlyIncome = parseFloat(localStorage.getItem('monthlyNet')) || 0;
    let inputs = document.querySelectorAll('.budget-input');
    let remainingValueDisp = document.getElementById('remaining-value');

    function calculateRemaining() {
        let totalExpenses = 0;

        inputs.forEach(function(input) {
            let val = parseFloat(input.value) || 0;
            totalExpenses = totalExpenses + val;
        });

        let remaining = monthlyIncome - totalExpenses;

        if (remainingValueDisp) {
            remainingValueDisp.innerText = "$" + Math.round(remaining).toLocaleString();
            
            if (remaining < 0) {
                remainingValueDisp.style.color = "#ff4d4d";
            } else {
                remainingValueDisp.style.color = "#118C4F";
            }
        }

        localStorage.setItem('finalSurplus', remaining);
    }

    inputs.forEach(function(input) {
        input.oninput = calculateRemaining;
    });

    calculateRemaining();
}

function renderResults() {
    let surplus = parseFloat(localStorage.getItem('finalSurplus')) || 0;
    let monthlyNet = parseFloat(localStorage.getItem('monthlyNet')) || 0;

    let statusEl = document.getElementById('balance-status');
    let amtEl = document.getElementById('balance-amt');
    let chartAmt = document.getElementById('chart-amount');

    if (statusEl) {
        if (surplus >= 0) {
            statusEl.innerText = "Surplus!";
            statusEl.style.color = "#118C4F";
        } else {
            statusEl.innerText = "Deficit!";
            statusEl.style.color = "#ff4d4d";
        }
    }
    
    if (amtEl) {
        let sign = surplus >= 0 ? "+$" : "-$";
        amtEl.innerText = sign + Math.abs(Math.round(surplus)).toLocaleString();
    }
    
    if (chartAmt) {
        chartAmt.innerText = "$" + Math.round(monthlyNet).toLocaleString();
    }

    let savingsPercent = (surplus / monthlyNet) * 100;
    let tipText = document.getElementById('tip-text');
    
    if (tipText) {
        if (surplus > 0) {
            tipText.innerText = "You're saving " + savingsPercent.toFixed(1) + "% of your take-home. Experts say 10% is good.";
        } else {
            tipText.innerText = "You're spending more than you earn! Try cutting back on some stuff.";
        }
    }

    let ctx = document.getElementById('budgetChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Remaining', 'Spent'],
                datasets: [{
                    data: [Math.max(0, surplus), Math.max(0, monthlyNet - surplus)],
                    backgroundColor: ['#118C4F', '#e1f0ff'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '80%',
                plugins: { legend: { display: false } }
            }
        });
    }
}

init();