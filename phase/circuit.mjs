export const N=1,E=2,S=4,W=8;
export const solution=[0,E|S,E|W|S,0,E|W,N|W,N|S,E|S,0,0,N|E,N|W,0,0,0,0];
// The intended route: west -> 4 -> 5 -> 1 -> 2 -> 6 -> 10 -> 11 -> 7 -> east.
solution[2]=W|S;solution[7]=E|S;
export const owner=Array.from({length:16},(_,i)=>i%3===0?"echo":"real");
export function rotate(mask){return ((mask<<1)&15)|(mask>>3);}
export function initial(){return solution.map((mask,i)=>{for(let j=0;j<(i%3)+1;j++)mask=rotate(mask);return mask;});}
export function turn(board,index,realm){if(owner[index]!==realm)return false;board[index]=rotate(board[index]);return true;}
export function connected(board){
 if(!(board[4]&W))return [];
 const seen=new Set([4]),queue=[4];
 for(const index of queue){const row=Math.floor(index/4),col=index%4;
 for(const [bit,opposite,dr,dc] of [[N,S,-1,0],[E,W,0,1],[S,N,1,0],[W,E,0,-1]]){
 const r=row+dr,c=col+dc,j=r*4+c;
 if(r>=0&&r<4&&c>=0&&c<4&&(board[index]&bit)&&(board[j]&opposite)&&!seen.has(j)){seen.add(j);queue.push(j);}
 }}return [...seen];
}
export function solved(board){return connected(board).includes(7)&&!!(board[7]&E);}

