{

  var MINUTES = 'minutes';
  var SECONDS = 'seconds';
  var METERS = 'meters'
  var KM = 'Kilometers'

  function _calcUnit(unit) {
    switch (unit) {
      case '\'':
      case '’':
      case '’':
      case '‘':
      case '’':
      case '`':
      case '´':
        return MINUTES;
      case '\'\'':
      case '"':
      case '’’':
      case '“':
      case '”':
      case '’’':
      case '``':
        return SECONDS;
      case 'm':
        return METERS;
      case 'km':
        return KM;
    }
  }

  function Group(exercises) {
    this.exercises = exercises;
    this.recovery = null;
  }

  Group.prototype.setRecovery = function (recovery) {
    this.recovery = recovery;
  }

  function Interval(duration, type) {
    this.duration = duration;
    this.type = type;
    this.recovery = null;
  }

  Interval.prototype.setRecovery = function (recovery) {
    this.recovery = recovery;
  }

  function Repetition(times, unit) {
    this.times = times;
    this.unit = unit;
  }

  function processSequenceOfExercises(first, exercises) {
    var results = [first];
    for (var i=0, l = exercises.length; i < l; i++) {
      results.push(exercises[i][3]);
    }
    return new Group(results);
  }
}

start = program

program = left:exercise right:(_ "+" _ exercise)*               { if (!right) return left; else return processSequenceOfExercises(left, right) }

exercise = times:repetition? s:series rec:recovery?             { if (rec) s.setRecovery(rec); if (times) return new Repetition(times, s); else return s; }

series = minutes:number minutes seconds:number seconds          { return new Interval(minutes * 60 + seconds, _calcUnit("''")) }
 /  left:number right:durationUnits                             { return new Interval(left, right) }
 / "(" _ p:program _")"                                         { return p; }

repetition = times:number _ ("x" / "X" / "×" / "*") _           { return times; }

recovery = "/" minutes:number minutes seconds:number seconds    { return new Interval(minutes * 60 + seconds, _calcUnit("''")) }
 / "/" n:number u:timeunit                                      { return new Interval(n, _calcUnit(u)) }

// TOKENS
number = [0-9]+                                                 { return parseInt(text(), 10); }
durationUnits = (distanceunit / timeunit)                       { return _calcUnit(text()) }
distanceunit = "km" / "m"
timeunit = (seconds / minutes)
seconds = ("''" / "\"" / "“" / "”" / "’’" / "``")
minutes = ( "'" / "‘" / "’" / "`" / "´")
_ "whitespace" = [ \t\n\r]*